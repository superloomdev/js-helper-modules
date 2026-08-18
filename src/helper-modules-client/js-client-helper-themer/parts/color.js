// Info: Colour primitives and the contrast-correction pass for helper-themer.
//
// Pure arithmetic over hex strings: parsing, luminance, contrast ratio, mixing,
// and the HSL round trip that lets lightness move without dragging the hue.
//
// Loader pattern: SINGLETON part. Lib, CONFIG, and ERRORS are assigned once
// from the uniform parts signature; the public object closes over them.
'use strict';


// Shared dependencies injected by loader (uniform parts signature)
let Lib;               // eslint-disable-line no-unused-vars
let CONFIG;            // eslint-disable-line no-unused-vars
let ERRORS;            // eslint-disable-line no-unused-vars


// Grouping a palette walks every entry, and a palette is stable for the life of
// a template. Without this cache a theme with several contrast violations
// re-indexes the whole palette once per violation.
const palette_family_cache = new WeakMap();


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
    Singleton part loader. Assigns the uniform part dependencies to
    module scope and returns the shared Color object.

@param {Object} shared_libs - Lib container with Utils
@param {Object} config - Merged config from the parent module
@param {Object} errors - Frozen error catalog from the parent module

@return {Object} - Public Color interface
*********************************************************************/
module.exports = function loader (shared_libs, config, errors) {

  // Assign to module-scope vars so the public object can close over them
  Lib = shared_libs;
  CONFIG = config;
  ERRORS = errors;

  return Color;

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Color = {


  // ~~~~~~~~~~~~~~~~~~~~ Conversion ~~~~~~~~~~~~~~~~~~~~
  // Hex to channels and back, the base every other function here builds on.

  /********************************************************************
      Parse a hex colour into red, green, and blue channels.

      Accepts both the three-digit and six-digit forms, with or without
      a leading hash.

      @param {String} hex - Hex colour such as '#0f62fe' or 'f0f'

      @return {Object} - Channel values
      @return {Number} .r - Red channel, 0 to 255
      @return {Number} .g - Green channel, 0 to 255
      @return {Number} .b - Blue channel, 0 to 255
  *********************************************************************/
  parseHex: function (hex) {

    // Strip the hash so both written forms parse through one path
    const body = String(hex).replace('#', '');

    // Expand the shorthand form by doubling each digit
    const full = (body.length === 3) ? body.split('').map(function (d) {
      return d + d;
    }).join('') : body;

    // Return the three channels as integers
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    };

  },


  /********************************************************************
      Compose red, green, and blue channels into a hex colour.

      @param {Object} rgb - Channel values
      @param {Number} rgb.r - Red channel
      @param {Number} rgb.g - Green channel
      @param {Number} rgb.b - Blue channel

      @return {String} - Hex colour with a leading hash
  *********************************************************************/
  toHex: function (rgb) {

    // Clamp and pad each channel so arithmetic overflow cannot produce a short string
    return '#' + _Color.channelToPair(rgb.r) + _Color.channelToPair(rgb.g) + _Color.channelToPair(rgb.b);

  },


  /********************************************************************
      Convert a hex colour to hue, saturation, and lightness.

      Lightness is the axis the contrast pass moves, and moving it in
      HSL keeps the hue and saturation intact so a brand colour stays
      recognizable instead of washing toward grey.

      @param {String} hex - Hex colour

      @return {Object} - HSL triple
      @return {Number} .h - Hue in degrees, 0 to 360
      @return {Number} .s - Saturation, 0 to 1
      @return {Number} .l - Lightness, 0 to 1
  *********************************************************************/
  rgbToHsl: function (hex) {

    // Normalize the channels to the unit interval the HSL formula expects
    const rgb = Color.parseHex(hex);
    const rn = rgb.r / 255;
    const gn = rgb.g / 255;
    const bn = rgb.b / 255;

    // Lightness is the midpoint of the widest and narrowest channel
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    const l = (max + min) / 2;

    // A zero spread means grey, which has no meaningful hue to compute
    if (delta === 0) {
      return {
        h: 0,
        s: 0,
        l: l
      };
    }

    // Saturation scales the spread against how much room the lightness leaves
    const s = delta / (1 - Math.abs((2 * l) - 1));

    // Hue is the angle toward whichever channel dominates
    const h = _Color.hueFromChannels(rn, gn, bn, max, delta);

    return {
      h: (h + 360) % 360,
      s: s,
      l: l
    };

  },


  /********************************************************************
      Convert hue, saturation, and lightness back to a hex colour.

      @param {Object} hsl - HSL triple
      @param {Number} hsl.h - Hue in degrees
      @param {Number} hsl.s - Saturation, 0 to 1
      @param {Number} hsl.l - Lightness, 0 to 1

      @return {String} - Hex colour with a leading hash
  *********************************************************************/
  hslToRgb: function (hsl) {

    // Chroma is the channel spread this lightness and saturation allow
    const c = (1 - Math.abs((2 * hsl.l) - 1)) * hsl.s;
    const hp = hsl.h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));

    // Place chroma and the intermediate value into the sextant the hue falls in
    const rgb = _Color.sextantChannels(hp, c, x);

    // Lift all three channels so the midpoint lands on the requested lightness
    const m = hsl.l - (c / 2);

    return Color.toHex({
      r: (rgb[0] + m) * 255,
      g: (rgb[1] + m) * 255,
      b: (rgb[2] + m) * 255
    });

  },


  // ~~~~~~~~~~~~~~~~~~~~ Measurement ~~~~~~~~~~~~~~~~~~~~
  // The two readings the contrast rules are written against.

  /********************************************************************
      Compute the relative luminance of a hex colour.

      Follows the WCAG definition, including the per-channel gamma
      expansion, so the ratio it feeds is the one accessibility
      thresholds are written against.

      @param {String} hex - Hex colour

      @return {Number} - Relative luminance, 0 to 1
  *********************************************************************/
  luminance: function (hex) {

    // Expand each channel out of gamma before weighting
    const rgb = Color.parseHex(hex);
    const r = _Color.channelLuminance(rgb.r);
    const g = _Color.channelLuminance(rgb.g);
    const b = _Color.channelLuminance(rgb.b);

    // Weight the channels by how strongly the eye responds to each
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);

  },


  /********************************************************************
      Compute the contrast ratio between two hex colours.

      @param {String} hex_a - First colour
      @param {String} hex_b - Second colour

      @return {Number} - Ratio from 1 to 21
  *********************************************************************/
  contrastRatio: function (hex_a, hex_b) {

    // Order the two luminances so the ratio is always at least 1
    const a = Color.luminance(hex_a);
    const b = Color.luminance(hex_b);

    // The constant keeps very dark pairs from producing an unbounded ratio
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

  },


  // ~~~~~~~~~~~~~~~~~~~~ Derivation ~~~~~~~~~~~~~~~~~~~~
  // Producing a new colour from existing ones.

  /********************************************************************
      Blend two hex colours by weight.

      @param {String} hex_a - Colour the weight applies to
      @param {String} hex_b - Colour that supplies the remainder
      @param {Number} weight_percent - Share of the first colour, 0 to 100

      @return {String} - Blended hex colour
  *********************************************************************/
  mix: function (hex_a, hex_b, weight_percent) {

    // Convert the percentage to a fraction once for all three channels
    const a = Color.parseHex(hex_a);
    const b = Color.parseHex(hex_b);
    const w = weight_percent / 100;

    // Interpolate each channel independently
    return Color.toHex({
      r: (a.r * w) + (b.r * (1 - w)),
      g: (a.g * w) + (b.g * (1 - w)),
      b: (a.b * w) + (b.b * (1 - w))
    });

  },


  /********************************************************************
      Express a hex colour as an rgba string at a given opacity.

      @param {String} hex - Hex colour
      @param {Number} opacity - Alpha value, 0 to 1

      @return {String} - CSS rgba string
  *********************************************************************/
  rgbaFrom: function (hex, opacity) {

    // Both platforms accept the rgba form, so no per-platform branch is needed
    const rgb = Color.parseHex(hex);

    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + opacity + ')';

  },


  // ~~~~~~~~~~~~~~~~~~~~ Contrast Correction ~~~~~~~~~~~~~~~~~~~~
  // Three strategies in a deliberate order. The earlier ones keep the corrected
  // value inside the design system; mixing toward black or white invents a
  // colour that exists nowhere in the palette, so it is the last resort.

  /********************************************************************
      Group a flat palette into hue families with ordered steps.

      @param {Object} palette - Flat map such as { red60: '#da1e28' }

      @return {Object} - Map of family name to steps, ascending by step
  *********************************************************************/
  groupPalette: function (palette) {

    // Reuse the grouping when the same palette object is seen again
    const cached = palette_family_cache.get(palette);
    if (cached) {
      return cached;
    }

    // Split every key that reads as a family name followed by a step number
    const families = {};
    const keys = Object.keys(palette);

    for (let i = 0; i < keys.length; i++) {
      const match = /^([a-zA-Z]+)(\d+)$/.exec(keys[i]);

      // Skip keys that carry no step, such as a one-off named accent
      if (!match) {
        continue;
      }

      // File the entry under its family, creating the bucket on first sight
      const family = match[1];
      families[family] = families[family] || [];

      // Lowercase the hex so later identity comparisons are case-insensitive
      families[family].push({
        step: Number(match[2]),
        hex: String(palette[keys[i]]).toLowerCase()
      });
    }

    // Order each family so a walk toward lighter or darker is a simple slice
    const family_names = Object.keys(families);
    for (let i = 0; i < family_names.length; i++) {
      families[family_names[i]].sort(function (a, b) {
        return a.step - b.step;
      });
    }

    // Cache against the palette object identity, which is stable per template
    palette_family_cache.set(palette, families);

    return families;

  },


  /********************************************************************
      Find a compliant replacement for a colour that fails a contrast
      threshold against its background.

      @param {String} before - The failing colour
      @param {String} against - The colour it must contrast with
      @param {Number} min_ratio - Required contrast ratio
      @param {Object} palette - Flat palette, used by the snap strategy

      @return {Object} - Correction result
      @return {String} .value - The replacement colour
      @return {String} .strategy - Which strategy produced the replacement
  *********************************************************************/
  correctForContrast: function (before, against, min_ratio, palette) {

    // A dark background needs a lighter foreground, and the reverse
    const needs_lighter = Color.luminance(against) <= 0.45;
    const families = Color.groupPalette(palette || {});

    // Strategy 1: the failing value is itself a palette entry, so walk its own
    // family to the nearest compliant step and stay inside the design system
    const snapped = _Color.snapWithinFamily(before, against, min_ratio, families, needs_lighter);
    if (snapped) {
      return snapped;
    }

    // Strategy 2: a custom brand colour, so move lightness while holding hue
    const shifted = _Color.shiftLightness(before, against, min_ratio, needs_lighter);
    if (shifted) {
      return shifted;
    }

    // Strategy 3: nothing else satisfied the threshold, so mix toward the extreme
    return _Color.mixToExtreme(before, against, min_ratio, needs_lighter);

  }

};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Color = {

  /********************************************************************
      Clamp a channel to the byte range and render it as a hex pair.

      @param {Number} value - Raw channel value

      @return {String} - Two-character hex pair
  *********************************************************************/
  channelToPair: function (value) {

    // Clamp before rounding so arithmetic overshoot cannot wrap the value
    const clamped = Math.max(0, Math.min(255, Math.round(value)));

    return clamped.toString(16).padStart(2, '0');

  },


  /********************************************************************
      Expand one channel out of gamma for the luminance calculation.

      @param {Number} value - Channel value, 0 to 255

      @return {Number} - Linear channel value, 0 to 1
  *********************************************************************/
  channelLuminance: function (value) {

    // The low end is linear; above the knee the response is a power curve
    const c = value / 255;

    return (c <= 0.03928) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);

  },


  /********************************************************************
      Compute the hue angle from normalized channels.

      @param {Number} rn - Red channel, 0 to 1
      @param {Number} gn - Green channel, 0 to 1
      @param {Number} bn - Blue channel, 0 to 1
      @param {Number} max - Largest of the three channels
      @param {Number} delta - Spread between largest and smallest

      @return {Number} - Hue in degrees, possibly negative
  *********************************************************************/
  hueFromChannels: function (rn, gn, bn, max, delta) {

    // The dominant channel decides which 120 degree arc the hue sits in
    if (max === rn) {
      return 60 * (((gn - bn) / delta) % 6);
    }

    if (max === gn) {
      return 60 * (((bn - rn) / delta) + 2);
    }

    return 60 * (((rn - gn) / delta) + 4);

  },


  /********************************************************************
      Place chroma into the correct sextant of the colour wheel.

      @param {Number} hp - Hue divided by 60
      @param {Number} c - Chroma
      @param {Number} x - Intermediate component

      @return {Number[]} - Red, green, and blue components before lifting
  *********************************************************************/
  sextantChannels: function (hp, c, x) {

    // Each sextant assigns chroma, the intermediate, and zero to a fixed order
    if (hp < 1) {
      return [c, x, 0];
    }

    if (hp < 2) {
      return [x, c, 0];
    }

    if (hp < 3) {
      return [0, c, x];
    }

    if (hp < 4) {
      return [0, x, c];
    }

    if (hp < 5) {
      return [x, 0, c];
    }

    return [c, 0, x];

  },


  /********************************************************************
      Walk the failing colour's own palette family to the nearest
      compliant step.

      @param {String} before - The failing colour
      @param {String} against - The colour it must contrast with
      @param {Number} min_ratio - Required contrast ratio
      @param {Object} families - Grouped palette from groupPalette
      @param {Boolean} needs_lighter - Whether to walk toward lighter steps

      @return {Object|null} - Correction result, or null when not applicable
  *********************************************************************/
  snapWithinFamily: function (before, against, min_ratio, families, needs_lighter) {

    // Look for the failing value among the palette entries
    const family_names = Object.keys(families);
    const target = before.toLowerCase();

    for (let i = 0; i < family_names.length; i++) {
      const steps = families[family_names[i]];
      const index = _Color.indexOfHex(steps, target);

      // Not this family, so keep looking
      if (index === -1) {
        continue;
      }

      // Order the remaining steps so the nearest compliant one is reached first
      const ordered = needs_lighter
        ? steps.slice(0, index).reverse()
        : steps.slice(index + 1);

      // Take the first step that clears the threshold
      for (let j = 0; j < ordered.length; j++) {
        if (Color.contrastRatio(ordered[j].hex, against) >= min_ratio) {

          return {
            value: ordered[j].hex,
            strategy: 'snap:' + family_names[i] + ordered[j].step
          };

        }
      }
    }

    // The value is not a palette entry, or its family has no compliant step
    return null;

  },


  /********************************************************************
      Move a colour's lightness while holding its hue and saturation.

      @param {String} before - The failing colour
      @param {String} against - The colour it must contrast with
      @param {Number} min_ratio - Required contrast ratio
      @param {Boolean} needs_lighter - Whether to raise lightness

      @return {Object|null} - Correction result, or null when not applicable
  *********************************************************************/
  shiftLightness: function (before, against, min_ratio, needs_lighter) {

    // A near-grey colour has no hue worth preserving, so this strategy adds nothing
    const hsl = Color.rgbToHsl(before);
    if (hsl.s <= 0.05) {
      return null;
    }

    // Step lightness one percent at a time until the threshold is cleared
    for (let i = 1; i <= 100; i++) {
      const l = needs_lighter
        ? Math.min(1, hsl.l + (i / 100))
        : Math.max(0, hsl.l - (i / 100));

      const candidate = Color.hslToRgb({
        h: hsl.h,
        s: hsl.s,
        l: l
      });

      // Accept the first compliant lightness, which is the smallest change
      if (Color.contrastRatio(candidate, against) >= min_ratio) {

        return {
          value: candidate,
          strategy: 'lightness'
        };

      }
    }

    // Even full lightness travel could not satisfy the threshold
    return null;

  },


  /********************************************************************
      Mix the colour toward white or black until it complies.

      This is the last resort, because the result is a colour that
      exists nowhere in the palette.

      @param {String} before - The failing colour
      @param {String} against - The colour it must contrast with
      @param {Number} min_ratio - Required contrast ratio
      @param {Boolean} needs_lighter - Whether to mix toward white

      @return {Object} - Correction result
  *********************************************************************/
  mixToExtreme: function (before, against, min_ratio, needs_lighter) {

    // Choose the extreme that moves away from the background
    const extreme = needs_lighter ? '#ffffff' : '#000000';

    // Increase the share of the extreme until the threshold is cleared
    for (let i = 1; i <= 100; i++) {
      const candidate = Color.mix(extreme, before, i);

      if (Color.contrastRatio(candidate, against) >= min_ratio) {

        return {
          value: candidate,
          strategy: 'mix'
        };

      }
    }

    // Full travel to the extreme is the best available answer
    return {
      value: extreme,
      strategy: 'mix'
    };

  },


  /********************************************************************
      Find the index of a hex value within an ordered family.

      @param {Object[]} steps - Family steps from groupPalette
      @param {String} target - Lowercased hex to locate

      @return {Number} - Index, or -1 when absent
  *********************************************************************/
  indexOfHex: function (steps, target) {

    // Scan for an exact match on the lowercased hex
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].hex === target) {
        return i;
      }
    }

    return -1;

  }

};/////////////////////////// Private Functions END /////////////////////////////
