# @superloomdev/js-server-helper-storage-local-fs

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-brightgreen.svg)](https://nodejs.org)

Local filesystem storage module for Node.js. Wraps `node:fs` with path safety, error mapping, and an API that mirrors the S3 storage module. Part of [Superloom](https://superloom.dev).

## What This Is

A server-side local filesystem storage wrapper built on Node's `fs` module. It provides the same API as the S3 storage module (`uploadFile`, `getFile`, `deleteFile`, `copyFile`, `moveFile`, `listFiles`) so applications can switch between local filesystem and S3 by changing one loader line. Zero npm dependencies - everything uses Node.js built-ins.

## Behavior

The module provides eight functions:

- **`uploadFile`** - write a file, creating parent directories as needed.
- **`uploadFiles`** - write multiple files in parallel.
- **`getFile`** - read a file as string or Buffer.
- **`deleteFile`** - delete a single file.
- **`deleteFiles`** - delete multiple files in parallel.
- **`copyFile`** - copy a file to a new location.
- **`moveFile`** - move a file (copy then delete source).
- **`listFiles`** - list files in a bucket with optional prefix filter.

## Hot-Swappable with the S3 Sibling

This module mirrors the API of `helper-storage-aws-s3`. The `bucket` parameter maps to a subdirectory under `ROOT_DIRECTORY` in the local module and an S3 bucket in the S3 module. Switch the loader line to move between local development and cloud storage without rewriting your code.

## Why Use This Module

- **Zero npm dependencies.** Built on Node's `fs` and `path` modules, which ship with the runtime.
- **Path safety built in.** All paths are resolved relative to ROOT_DIRECTORY and checked for directory traversal attacks before any file operation.
- **Pre-tested at every release.** A full test suite using a temp directory runs in CI on every push.
- **Designed for human review.** The code is laid out as clearly-marked visual sections so a reviewer can read it top to bottom without getting lost.

## Aligned with Superloom Philosophy

If your project is built on Superloom conventions (the same loader pattern, the same testing model), this module slots in without you needing to learn anything new.

## Documentation

- [API Reference](docs/api.md) - every exported function, parameter, and return shape
- [Configuration](docs/configuration.md) - loader pattern, config keys, path safety
