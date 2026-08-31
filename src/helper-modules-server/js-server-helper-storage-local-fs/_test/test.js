// Tests for helper-storage-local-fs
// Covers all exported functions with automated assertions
// Uses a temp directory for test storage
import assert from 'node:assert/strict';
import { describe, it, after } from 'node:test';
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';

// Load dependencies via loader (DI pattern)
import loader from './loader.js';
import localFsLoader from 'helper-storage-local-fs';
const { Lib } = loader();
const LocalFs = Lib.LocalFs;
const test_root = Lib._testRoot;



describe('uploadFile', function () {

  it('should write a file to the local filesystem', async function () {

    const result = await LocalFs.uploadFile({}, 'test-bucket', 'file1.txt', 'Hello World');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.key, 'file1.txt');
    assert.strictEqual(result.error, null);

    // Verify the file was actually written
    const content = await nodeFs.readFile(nodePath.join(test_root, 'test-bucket', 'file1.txt'), 'utf8');
    assert.strictEqual(content, 'Hello World');

  });


  it('should create parent directories as needed', async function () {

    const result = await LocalFs.uploadFile({}, 'test-bucket', 'sub/dir/file2.txt', 'Nested');

    assert.strictEqual(result.success, true);

    const content = await nodeFs.readFile(nodePath.join(test_root, 'test-bucket', 'sub/dir/file2.txt'), 'utf8');
    assert.strictEqual(content, 'Nested');

  });


  it('should throw TypeError for empty bucket', async function () {

    await assert.rejects(
      function () { return LocalFs.uploadFile({}, '', 'file.txt', 'content'); },
      TypeError
    );

  });


  it('should throw TypeError for empty key', async function () {

    await assert.rejects(
      function () { return LocalFs.uploadFile({}, 'bucket', '', 'content'); },
      TypeError
    );

  });


  it('should throw TypeError for path traversal attempt', async function () {

    await assert.rejects(
      function () { return LocalFs.uploadFile({}, 'bucket', '../../../etc/passwd', 'content'); },
      TypeError
    );

  });

});



describe('uploadFiles', function () {

  it('should upload multiple files in parallel', async function () {

    const result = await LocalFs.uploadFiles({}, [
      { bucket: 'multi', key: 'a.txt', body: 'AAA' },
      { bucket: 'multi', key: 'b.txt', body: 'BBB' },
      { bucket: 'multi', key: 'c.txt', body: 'CCC' }
    ]);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.results.length, 3);

  });


  it('should throw TypeError for non-array input', async function () {

    await assert.rejects(
      function () { return LocalFs.uploadFiles({}, 'not-an-array'); },
      TypeError
    );

  });

});



describe('getFile', function () {

  it('should read a file as string by default', async function () {

    await LocalFs.uploadFile({}, 'read-bucket', 'file.txt', 'Read Me');

    const result = await LocalFs.getFile({}, 'read-bucket', 'file.txt');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.body, 'Read Me');
    assert.strictEqual(result.error, null);

  });


  it('should read a file as Buffer when output_as_string is false', async function () {

    await LocalFs.uploadFile({}, 'read-bucket', 'buffer.txt', 'Buffer Me');

    const result = await LocalFs.getFile({}, 'read-bucket', 'buffer.txt', false);

    assert.strictEqual(result.success, true);
    assert.ok(Buffer.isBuffer(result.body));

  });


  it('should return NOT_FOUND error for missing file', async function () {

    const result = await LocalFs.getFile({}, 'read-bucket', 'nonexistent.txt');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.body, null);
    assert.strictEqual(result.error.type, 'LOCAL_FS_NOT_FOUND');

  });

});



describe('deleteFile', function () {

  it('should delete an existing file', async function () {

    await LocalFs.uploadFile({}, 'delete-bucket', 'file.txt', 'Delete Me');

    const result = await LocalFs.deleteFile({}, 'delete-bucket', 'file.txt');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 1);
    assert.strictEqual(result.error, null);

  });


  it('should return NOT_FOUND error for missing file', async function () {

    const result = await LocalFs.deleteFile({}, 'delete-bucket', 'nonexistent.txt');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'LOCAL_FS_NOT_FOUND');

  });

});



describe('deleteFiles', function () {

  it('should delete multiple files', async function () {

    await LocalFs.uploadFile({}, 'delete-multi', 'a.txt', 'A');
    await LocalFs.uploadFile({}, 'delete-multi', 'b.txt', 'B');

    const result = await LocalFs.deleteFiles({}, 'delete-multi', ['a.txt', 'b.txt']);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deleted_count, 2);

  });


  it('should throw TypeError for non-array keys', async function () {

    await assert.rejects(
      function () { return LocalFs.deleteFiles({}, 'bucket', 'not-an-array'); },
      TypeError
    );

  });

});



describe('copyFile', function () {

  it('should copy a file to a new location', async function () {

    await LocalFs.uploadFile({}, 'copy-bucket', 'source.txt', 'Copy Me');

    const result = await LocalFs.copyFile({}, 'copy-bucket', 'source.txt', 'copy-bucket', 'dest.txt');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.key, 'dest.txt');

    // Verify both files exist
    const source = await LocalFs.getFile({}, 'copy-bucket', 'source.txt');
    const dest = await LocalFs.getFile({}, 'copy-bucket', 'dest.txt');
    assert.strictEqual(source.body, 'Copy Me');
    assert.strictEqual(dest.body, 'Copy Me');

  });


  it('should return NOT_FOUND error for missing source', async function () {

    const result = await LocalFs.copyFile({}, 'copy-bucket', 'nonexistent.txt', 'copy-bucket', 'dest.txt');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'LOCAL_FS_NOT_FOUND');

  });

});



describe('moveFile', function () {

  it('should move a file to a new location', async function () {

    await LocalFs.uploadFile({}, 'move-bucket', 'source.txt', 'Move Me');

    const result = await LocalFs.moveFile({}, 'move-bucket', 'source.txt', 'move-bucket', 'moved.txt');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.key, 'moved.txt');

    // Verify source is gone and destination exists
    const source_result = await LocalFs.getFile({}, 'move-bucket', 'source.txt');
    assert.strictEqual(source_result.success, false);

    const dest_result = await LocalFs.getFile({}, 'move-bucket', 'moved.txt');
    assert.strictEqual(dest_result.success, true);
    assert.strictEqual(dest_result.body, 'Move Me');

  });

});



describe('listFiles', function () {

  it('should list files in a bucket', async function () {

    await LocalFs.uploadFile({}, 'list-bucket', 'a.txt', 'A');
    await LocalFs.uploadFile({}, 'list-bucket', 'sub/b.txt', 'B');

    const result = await LocalFs.listFiles({}, 'list-bucket');

    assert.strictEqual(result.success, true);
    assert.ok(result.keys.length >= 2);

  });


  it('should filter by prefix', async function () {

    await LocalFs.uploadFile({}, 'list-prefix', 'docs/readme.md', 'readme');
    await LocalFs.uploadFile({}, 'list-prefix', 'docs/guide.md', 'guide');
    await LocalFs.uploadFile({}, 'list-prefix', 'images/logo.png', 'logo');

    const result = await LocalFs.listFiles({}, 'list-prefix', 'docs/');

    assert.strictEqual(result.success, true);
    assert.ok(result.keys.every(function (k) { return k.startsWith('docs/'); }));

  });


  it('should return NOT_FOUND error for missing bucket', async function () {

    const result = await LocalFs.listFiles({}, 'nonexistent-bucket');

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error.type, 'LOCAL_FS_NOT_FOUND');

  });

});



describe('loader', function () {

  it('should throw TypeError for empty ROOT_DIRECTORY', function () {

    assert.throws(
      function () {
        localFsLoader(Lib, { ROOT_DIRECTORY: '' });
      },
      TypeError
    );

  });

});



// Cleanup test directory after all tests
after(async function () {

  try {
    await nodeFs.rm(test_root, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }

});
