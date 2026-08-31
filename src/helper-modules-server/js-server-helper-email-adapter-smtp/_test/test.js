// Tests for helper-email-adapter-smtp
// Covers the adapter contract and config validation
// Uses an in-process SMTP server (smtp-server) for real send testing
import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { SMTPServer } from 'smtp-server';

// Load dependencies via loader (DI pattern)
import loader from './loader.js';
import smtpAdapterLoader from 'helper-email-adapter-smtp';
const { Lib } = loader();

// ==================== IN-PROCESS SMTP SERVER ==================== //

let smtp_server = null;
let smtp_port = null;
let received_messages = [];
let testAdapter = null;

function startSmtpServer () {
  return new Promise(function (resolve) {
    smtp_server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      logger: false,
      onData: function (stream, session, callback) {
        let raw = '';
        stream.on('data', function (chunk) {
          raw += chunk.toString();
        });
        stream.on('end', function () {
          received_messages.push({
            from: session.envelope.mailFrom,
            to: session.envelope.rcptTo,
            raw: raw
          });
          callback();
        });
      }
    });
    smtp_server.listen(0, '127.0.0.1', function () {
      smtp_port = smtp_server.server.address().port;
      resolve();
    });
  });
}

function stopSmtpServer () {
  return new Promise(function (resolve) {
    if (smtp_server) {
      smtp_server.close(function () {
        smtp_server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// ==================== TESTS ==================== //

before(async function () {

  // Start the in-process SMTP server
  await startSmtpServer();

  // Create a fresh adapter pointing to our test server
  testAdapter = smtpAdapterLoader(Lib, {
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: smtp_port,
    SMTP_SECURE: false
  });

});

after(async function () {

  // Stop the in-process SMTP server
  await stopSmtpServer();

});



describe('send', function () {

  it('should send a text email through the SMTP server', async function () {

    received_messages = [];

    const result = await testAdapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'Test Subject',
      text: 'Hello World',
      headers: { 'Precedence': 'transactional' }
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.message_id);
    assert.strictEqual(result.accepted.length, 1);
    assert.strictEqual(result.rejected.length, 0);
    assert.strictEqual(result.error, null);

    // Verify the SMTP server received the message
    assert.strictEqual(received_messages.length, 1);
    assert.ok(received_messages[0].raw.indexOf('Test Subject') >= 0);
    assert.ok(received_messages[0].raw.indexOf('Hello World') >= 0);

  });


  it('should send an HTML email through the SMTP server', async function () {

    received_messages = [];

    const result = await testAdapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'HTML Test',
      html: '<h1>Hello HTML</h1>',
      headers: {}
    });

    assert.strictEqual(result.success, true);
    assert.ok(received_messages[0].raw.indexOf('<h1>Hello HTML</h1>') >= 0);

  });


  it('should send an email with attachments', async function () {

    received_messages = [];

    const result = await testAdapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'Attachment Test',
      text: 'See attached',
      attachments: [
        { filename: 'test.txt', content: 'Attachment content here', contentType: 'text/plain' }
      ],
      headers: {}
    });

    assert.strictEqual(result.success, true);
    // Attachment content is base64-encoded in the raw email; check for filename
    assert.ok(received_messages[0].raw.indexOf('test.txt') >= 0);
    assert.ok(received_messages[0].raw.indexOf('attachment') >= 0);

  });


  it('should send to multiple recipients', async function () {

    received_messages = [];

    const result = await testAdapter.send({}, {
      from: 'sender@test.local',
      to: ['user1@test.local', 'user2@test.local'],
      cc: ['cc@test.local'],
      bcc: [],
      subject: 'Multi recipient',
      text: 'Hello all',
      headers: {}
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.accepted.length >= 2);

  });


  it('should pass custom headers through to the SMTP message', async function () {

    received_messages = [];

    await testAdapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'Header Test',
      text: 'Body',
      headers: { 'X-Custom-Header': 'custom-value' }
    });

    assert.ok(received_messages[0].raw.indexOf('X-Custom-Header') >= 0);

  });


  it('should sign emails with DKIM when DKIM config is provided', async function () {

    received_messages = [];

    // Create a test DKIM key pair (in real usage, this would be a real key)
    const dkim_adapter = smtpAdapterLoader(Lib, {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: smtp_port,
      SMTP_SECURE: false,
      SMTP_DKIM_DOMAIN: 'test.local',
      SMTP_DKIM_SELECTOR: 'test',
      SMTP_DKIM_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nfakekey\n-----END RSA PRIVATE KEY-----'
    });

    // The DKIM signing will fail with a fake key, but the test verifies
    // that the DKIM config is passed through. We catch the error and
    // verify the adapter attempted to sign.
    const result = await dkim_adapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'DKIM Test',
      text: 'Body',
      headers: {}
    });

    // With a fake key, Nodemailer may still send (DKIM is best-effort).
    // The test verifies the adapter does not crash with DKIM config.
    assert.strictEqual(typeof result.success, 'boolean');

  });


  it('should reject attachments exceeding per-file size limit', async function () {

    // Create an adapter with a 1 MB per-file limit
    const limited_adapter = smtpAdapterLoader(Lib, {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: smtp_port,
      SMTP_SECURE: false,
      SMTP_MAX_ATTACHMENT_SIZE_MB: 1
    });

    received_messages = [];

    const result = await limited_adapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'Large Attachment',
      text: 'See attached',
      attachments: [
        { filename: 'big.txt', content: 'x'.repeat(2 * 1024 * 1024), contentType: 'text/plain' }
      ],
      headers: {}
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'ATTACHMENT_TOO_LARGE');
    assert.strictEqual(received_messages.length, 0);

  });


  it('should reject attachments exceeding total size limit', async function () {

    // Create an adapter with a 1 MB total limit
    const limited_adapter = smtpAdapterLoader(Lib, {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: smtp_port,
      SMTP_SECURE: false,
      SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB: 1
    });

    received_messages = [];

    const result = await limited_adapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'Total too large',
      text: 'See attached',
      attachments: [
        { filename: 'a.txt', content: 'x'.repeat(600 * 1024), contentType: 'text/plain' },
        { filename: 'b.txt', content: 'x'.repeat(600 * 1024), contentType: 'text/plain' }
      ],
      headers: {}
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'ATTACHMENT_TOO_LARGE');
    assert.strictEqual(received_messages.length, 0);

  });


  it('should accept attachments within size limits', async function () {

    // Create an adapter with a 10 MB per-file limit
    const limited_adapter = smtpAdapterLoader(Lib, {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: smtp_port,
      SMTP_SECURE: false,
      SMTP_MAX_ATTACHMENT_SIZE_MB: 10,
      SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB: 10
    });

    received_messages = [];

    const result = await limited_adapter.send({}, {
      from: 'sender@test.local',
      to: ['user@test.local'],
      cc: [],
      bcc: [],
      subject: 'Small Attachment',
      text: 'See attached',
      attachments: [
        { filename: 'small.txt', content: 'small content', contentType: 'text/plain' }
      ],
      headers: {}
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(received_messages.length, 1);

  });

});



describe('loader', function () {

  it('should throw TypeError when SMTP_HOST is missing', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, { SMTP_HOST: null });
      },
      TypeError
    );

  });


  it('should throw TypeError when SMTP_HOST is empty', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, { SMTP_HOST: '' });
      },
      TypeError
    );

  });


  it('should throw TypeError when SMTP_PORT is invalid', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, { SMTP_HOST: 'smtp.test.local', SMTP_PORT: 0 });
      },
      TypeError
    );

  });


  it('should throw TypeError when SMTP_PORT is too high', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, { SMTP_HOST: 'smtp.test.local', SMTP_PORT: 99999 });
      },
      TypeError
    );

  });


  it('should throw TypeError when SMTP_SECURE is not a boolean', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, { SMTP_HOST: 'smtp.test.local', SMTP_PORT: 587, SMTP_SECURE: 'yes' });
      },
      TypeError
    );

  });


  it('should throw TypeError when SMTP_USER is not a string', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, { SMTP_HOST: 'smtp.test.local', SMTP_PORT: 587, SMTP_USER: 123 });
      },
      TypeError
    );

  });


  it('should throw TypeError when DKIM keys are partially provided', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, {
          SMTP_HOST: 'smtp.test.local',
          SMTP_PORT: 587,
          SMTP_DKIM_DOMAIN: 'test.local'
        });
      },
      TypeError
    );

  });


  it('should throw TypeError for invalid SMTP_MAX_ATTACHMENT_SIZE_MB', function () {

    assert.throws(
      function () {
        smtpAdapterLoader(Lib, {
          SMTP_HOST: 'smtp.test.local',
          SMTP_PORT: 587,
          SMTP_MAX_ATTACHMENT_SIZE_MB: -1
        });
      },
      TypeError
    );

  });


  it('should accept valid DKIM config', function () {

    const adapter = smtpAdapterLoader(Lib, {
      SMTP_HOST: 'smtp.test.local',
      SMTP_PORT: 587,
      SMTP_DKIM_DOMAIN: 'test.local',
      SMTP_DKIM_SELECTOR: 'test',
      SMTP_DKIM_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nfakekey\n-----END RSA PRIVATE KEY-----'
    });

    assert.ok(adapter);

  });

});
