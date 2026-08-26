// Info: Default configuration for helper-themer.
//
// All keys can be overridden by passing a config object to the loader.
export default {

  // Root font size in pixels. Web emit divides pixel sizes by this to produce
  // rem, so it must match the host document's root size or every size shifts.
  BASE_FONT_SIZE: 16,

  // Maximum number of resolve and emit results held per instance. Each entry
  // is one theme, so the bound protects a live theme editor from minting an
  // unbounded number of cache entries.
  CACHE_CAPACITY: 32,

  // Turns result caching off. Useful when a host measures cold derivation cost
  // or wants every call to observe a freshly built object.
  CACHE_ENABLED: true,

  // Minimum contrast ratio the correction pass enforces between a foreground
  // token and its declared background. 4.5 is the WCAG AA threshold for body text.
  MIN_CONTRAST_RATIO: 4.5

};
