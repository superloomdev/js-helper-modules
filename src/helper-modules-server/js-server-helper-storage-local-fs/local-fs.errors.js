/**
 * Error catalog for helper-storage-local-fs.
 * Frozen to prevent accidental mutation.
 */

export default Object.freeze({

  LOCAL_FS_WRITE_FAILED: Object.freeze({
    type: 'LOCAL_FS_WRITE_FAILED',
    message: 'Failed to write file to local filesystem'
  }),

  LOCAL_FS_READ_FAILED: Object.freeze({
    type: 'LOCAL_FS_READ_FAILED',
    message: 'Failed to read file from local filesystem'
  }),

  LOCAL_FS_DELETE_FAILED: Object.freeze({
    type: 'LOCAL_FS_DELETE_FAILED',
    message: 'Failed to delete file from local filesystem'
  }),

  LOCAL_FS_COPY_FAILED: Object.freeze({
    type: 'LOCAL_FS_COPY_FAILED',
    message: 'Failed to copy file within local filesystem'
  }),

  LOCAL_FS_MOVE_FAILED: Object.freeze({
    type: 'LOCAL_FS_MOVE_FAILED',
    message: 'Failed to move file within local filesystem'
  }),

  LOCAL_FS_LIST_FAILED: Object.freeze({
    type: 'LOCAL_FS_LIST_FAILED',
    message: 'Failed to list files in local filesystem'
  }),

  LOCAL_FS_NOT_FOUND: Object.freeze({
    type: 'LOCAL_FS_NOT_FOUND',
    message: 'File or directory not found'
  })

});
