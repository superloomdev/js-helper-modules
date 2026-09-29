# API

No configuration. This is a data-only package.

## Default export

```js
{
  id: 'carbon-v11',
  contract_version: 4,
  reference: { ... },
  schemes: { white, g10, g90, g100 }
}
```

Each scheme is a complete Themer template: `{ polarity, scales, tokens, meta, from_default, provenance }`. `provenance.icons` records `{ package, version, map_source, map_sha256 }` for the `icon.*` literals.
