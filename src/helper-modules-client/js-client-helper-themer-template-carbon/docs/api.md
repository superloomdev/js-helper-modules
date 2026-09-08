# API

No configuration. This is a data-only package.

## Default export

```js
{
  id: 'carbon-v11',
  contract_version: 2,
  reference: { ... },
  schemes: { white, g10, g90, g100 }
}
```

Each scheme is a complete Themer template: `{ polarity, scales, tokens, meta, from_base }`.
