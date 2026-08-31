// Tests for helper-email
// Covers all exported functions with automated assertions
// Uses a stub-adapter pattern for the transport
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

// Load dependencies via loader (DI pattern)
import loader from './loader.js';
import emailLoader from 'helper-email';
const { Lib } = loader();
const Email = Lib.Email;
const stubAdapter = Lib.Email._stubAdapter;



describe('sendEmail', function () {

  beforeEach(function () {

    // Reset stub adapter state between tests
    stubAdapter.sent_messages = [];
    stubAdapter.next_result = null;

  });


  it('should send a basic text email', async function () {

    const result = await Email.sendEmail({}, {
      to: 'user@test.local',
      from: 'sender@test.local',
      subject: 'Test Subject',
      text: 'Hello World'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.message_id);
    assert.strictEqual(result.accepted.length, 1);
    assert.strictEqual(result.accepted[0], 'user@test.local');
    assert.strictEqual(result.rejected.length, 0);
    assert.strictEqual(result.error, null);

    // Verify the adapter received the normalized message
    assert.strictEqual(stubAdapter.sent_messages.length, 1);
    const sent = stubAdapter.sent_messages[0];
    assert.deepStrictEqual(sent.to, ['user@test.local']);
    assert.strictEqual(sent.subject, 'Test Subject');
    assert.strictEqual(sent.text, 'Hello World');

  });


  it('should send an HTML email', async function () {

    const result = await Email.sendEmail({}, {
      to: 'user@test.local',
      subject: 'HTML Test',
      html: '<h1>Hello</h1>'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(stubAdapter.sent_messages[0].html, '<h1>Hello</h1>');

  });


  it('should use DEFAULT_FROM when from is omitted', async function () {

    await Email.sendEmail({}, {
      to: 'user@test.local',
      subject: 'Test',
      text: 'Body'
    });

    assert.strictEqual(stubAdapter.sent_messages[0].from, 'noreply@test.local');

  });


  it('should normalize string recipients to arrays', async function () {

    await Email.sendEmail({}, {
      to: 'user@test.local',
      cc: 'cc@test.local',
      bcc: 'bcc@test.local',
      from: 'sender@test.local',
      subject: 'Test',
      text: 'Body'
    });

    const sent = stubAdapter.sent_messages[0];
    assert.deepStrictEqual(sent.to, ['user@test.local']);
    assert.deepStrictEqual(sent.cc, ['cc@test.local']);
    assert.deepStrictEqual(sent.bcc, ['bcc@test.local']);

  });


  it('should apply transactional headers by default', async function () {

    await Email.sendEmail({}, {
      to: 'user@test.local',
      from: 'sender@test.local',
      subject: 'Test',
      text: 'Body'
    });

    assert.strictEqual(stubAdapter.sent_messages[0].headers.Precedence, 'transactional');

  });


  it('should apply promotional headers when message_type is promotional', async function () {

    await Email.sendEmail({}, {
      to: 'user@test.local',
      from: 'sender@test.local',
      subject: 'Promo',
      text: 'Body',
      message_type: 'promotional',
      unsubscribe_url: 'https://test.local/unsubscribe',
      unsubscribe_email: 'unsubscribe@test.local'
    });

    const headers = stubAdapter.sent_messages[0].headers;
    assert.strictEqual(headers.Precedence, 'bulk');
    assert.ok(headers['List-Unsubscribe']);
    assert.strictEqual(headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');

  });


  it('should throw TypeError when message is not an object', async function () {

    await assert.rejects(
      function () { return Email.sendEmail({}, 'not-an-object'); },
      TypeError
    );

  });


  it('should throw TypeError when no recipients are provided', async function () {

    await assert.rejects(
      function () {
        return Email.sendEmail({}, {
          from: 'sender@test.local',
          subject: 'Test',
          text: 'Body'
        });
      },
      TypeError
    );

  });


  it('should throw TypeError when subject is missing', async function () {

    await assert.rejects(
      function () {
        return Email.sendEmail({}, {
          to: 'user@test.local',
          text: 'Body'
        });
      },
      TypeError
    );

  });


  it('should throw TypeError when no body is provided', async function () {

    await assert.rejects(
      function () {
        return Email.sendEmail({}, {
          to: 'user@test.local',
          subject: 'Test'
        });
      },
      TypeError
    );

  });


  it('should throw TypeError for promotional message without unsubscribe fields', async function () {

    await assert.rejects(
      function () {
        return Email.sendEmail({}, {
          to: 'user@test.local',
          subject: 'Promo',
          text: 'Body',
          message_type: 'promotional'
        });
      },
      TypeError
    );

  });


  it('should return error envelope when adapter fails', async function () {

    stubAdapter.next_result = {
      success: false,
      message_id: null,
      accepted: [],
      rejected: ['user@test.local'],
      error: { type: 'SMTP_ERROR', message: 'Connection refused' }
    };

    const result = await Email.sendEmail({}, {
      to: 'user@test.local',
      from: 'sender@test.local',
      subject: 'Test',
      text: 'Body'
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message_id, null);
    assert.strictEqual(result.rejected.length, 1);
    assert.strictEqual(result.error.type, 'SMTP_ERROR');

  });


  it('should send an email with attachments', async function () {

    const result = await Email.sendEmail({}, {
      to: 'user@test.local',
      from: 'sender@test.local',
      subject: 'Test with attachment',
      text: 'See attached',
      attachments: [
        { filename: 'test.txt', content: 'Attachment content', contentType: 'text/plain' }
      ]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(stubAdapter.sent_messages[0].attachments.length, 1);
    assert.strictEqual(stubAdapter.sent_messages[0].attachments[0].filename, 'test.txt');

  });


  it('should send an email with only attachments (no body)', async function () {

    const result = await Email.sendEmail({}, {
      to: 'user@test.local',
      from: 'sender@test.local',
      subject: 'Attachment only',
      attachments: [
        { filename: 'report.pdf', content: Buffer.from('fake pdf'), contentType: 'application/pdf' }
      ]
    });

    assert.strictEqual(result.success, true);

  });

});



describe('buildTransactionalHeaders', function () {

  it('should return transactional precedence header', function () {

    const headers = Email.buildTransactionalHeaders();

    assert.strictEqual(headers.Precedence, 'transactional');

  });

});



describe('buildPromotionalHeaders', function () {

  it('should return bulk precedence and unsubscribe headers', function () {

    const headers = Email.buildPromotionalHeaders(
      'https://test.local/unsubscribe',
      'unsubscribe@test.local'
    );

    assert.strictEqual(headers.Precedence, 'bulk');
    assert.ok(headers['List-Unsubscribe'].indexOf('https://test.local/unsubscribe') >= 0);
    assert.ok(headers['List-Unsubscribe'].indexOf('mailto:unsubscribe@test.local') >= 0);
    assert.strictEqual(headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');

  });


  it('should throw TypeError for empty unsubscribe_url', function () {

    assert.throws(
      function () {
        Email.buildPromotionalHeaders('', 'unsubscribe@test.local');
      },
      TypeError
    );

  });


  it('should throw TypeError for empty unsubscribe_email', function () {

    assert.throws(
      function () {
        Email.buildPromotionalHeaders('https://test.local/unsubscribe', '');
      },
      TypeError
    );

  });

});



describe('loader', function () {

  it('should throw TypeError when Adapter is missing', function () {

    assert.throws(
      function () {
        emailLoader(Lib, {});
      },
      TypeError
    );

  });


  it('should throw TypeError when adapter does not implement send', function () {

    assert.throws(
      function () {
        emailLoader(Lib, { Adapter: {} });
      },
      TypeError
    );

  });


  it('should throw TypeError for invalid DEFAULT_MESSAGE_TYPE', function () {

    assert.throws(
      function () {
        emailLoader(Lib, {
          Adapter: stubAdapter,
          DEFAULT_MESSAGE_TYPE: 'invalid'
        });
      },
      TypeError
    );

  });

});



describe('signUnsubscribeToken', function () {

  it('should sign an email address and return a token', function () {

    const result = Email.signUnsubscribeToken({}, 'user@example.com');

    assert.strictEqual(result.success, true);
    assert.ok(result.token);
    assert.strictEqual(result.error, null);

    // Token should have two parts separated by a dot
    const parts = result.token.split('.');
    assert.strictEqual(parts.length, 2);

  });


  it('should produce verifiable tokens', function () {

    const sign_result = Email.signUnsubscribeToken({}, 'user@example.com');
    const verify_result = Email.verifyUnsubscribeToken({}, sign_result.token);

    assert.strictEqual(verify_result.success, true);
    assert.strictEqual(verify_result.email, 'user@example.com');
    assert.strictEqual(verify_result.error, null);

  });


  it('should throw TypeError for empty email', function () {

    assert.throws(
      function () {
        Email.signUnsubscribeToken({}, '');
      },
      TypeError
    );

  });


  it('should throw TypeError when UNSUBSCRIBE_SECRET is not configured', function () {

    // Create an email instance without UNSUBSCRIBE_SECRET
    const emailWithoutSecret = emailLoader(Lib, {
      Adapter: stubAdapter,
      DEFAULT_FROM: 'noreply@test.local'
    });

    assert.throws(
      function () {
        emailWithoutSecret.signUnsubscribeToken({}, 'user@example.com');
      },
      TypeError
    );

  });

});



describe('verifyUnsubscribeToken', function () {

  it('should verify a valid token and return the email', function () {

    const sign_result = Email.signUnsubscribeToken({}, 'user@example.com');
    const result = Email.verifyUnsubscribeToken({}, sign_result.token);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.email, 'user@example.com');
    assert.strictEqual(result.error, null);

  });


  it('should reject a tampered token', function () {

    const sign_result = Email.signUnsubscribeToken({}, 'user@example.com');

    // Tamper with the token by changing the last character
    const tampered_token = sign_result.token.slice(0, -1) + 'X';

    const result = Email.verifyUnsubscribeToken({}, tampered_token);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.email, null);
    assert.strictEqual(result.error.type, 'EMAIL_INVALID_TOKEN');

  });


  it('should reject a token with wrong email but valid-looking format', function () {

    // Sign one email, then try to verify with a different email's signature
    const sign1 = Email.signUnsubscribeToken({}, 'user1@example.com');
    const sign2 = Email.signUnsubscribeToken({}, 'user2@example.com');

    // Swap: email1's encoded part with email2's signature
    const parts1 = sign1.token.split('.');
    const parts2 = sign2.token.split('.');
    const mismatched_token = parts1[0] + '.' + parts2[1];

    const result = Email.verifyUnsubscribeToken({}, mismatched_token);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'EMAIL_INVALID_TOKEN');

  });


  it('should reject an invalid token format (no dot)', function () {

    const result = Email.verifyUnsubscribeToken({}, 'invalidtokennodothere');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'EMAIL_INVALID_TOKEN');

  });


  it('should throw TypeError for empty token', function () {

    assert.throws(
      function () {
        Email.verifyUnsubscribeToken({}, '');
      },
      TypeError
    );

  });

});
