// Info: Platform emitters for helper-themer.
//
// Resolution produces canonical, unit-free values. Emitting projects those
// values onto one platform's expectations: web wants rem and CSS strings,
// React Native wants raw numbers and style objects. Keeping the projection
// here is what lets one resolved theme serve both targets.
//
// A projection that cannot carry a fact reports the loss rather than dropping
// it, so a value never disappears without a record.
//
// Loader pattern: SINGLETON part. Lib, CONFIG, and ERRORS are assigned once
// from the uniform parts signature; the public object closes over them.
'use strict';


// Shared dependencies injected by loader (uniform parts signature)
let Lib;               // eslint-disable-line no-unused-vars
let CONFIG;            // eslint-disable-line no-unused-vars
let ERRORS;            // eslint-disable-line no-unused-vars

// Colour part, injected by the parent so the shadow emitter can build rgba
let Color;


// Platforms this engine emits for. React Native tolerates a style object that
// carries both the iOS shadow properties and the Android elevation, so the two
// native targets share one emitter rather than forcing a third platform.
const PLATFORMS = ['web', 'native'];


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton part loader. Assigns the uniform part dependencies plus
the colour part to module scope and returns the shared Emit object.

@param {Object} shared_libs - Lib container with Utils and the Color part
@param {Object} config - Merged config from the parent module
@param {Object} errors - Frozen error catalog from the parent module

@return {Object} - Public Emit interface
*********************************************************************/
module.exports = function loader (shared_libs, config, errors) {

  // Assign to module-scope vars so the public object can close over them
  Lib = shared_libs;
  CONFIG = config;
  ERRORS = errors;

  // The colour part rides in on the container, keeping the parts signature uniform
  Color = shared_libs.Color;

  return Emit;

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Emit = {


  // ~~~~~~~~~~~~~~~~~~~~ Platform Surface ~~~~~~~~~~~~~~~~~~~~
  // What the parent module needs to know about the available targets.

  /********************************************************************
  List the platforms this engine emits for.

  @return {String[]} - Platform names
  *********************************************************************/
  platforms: function () {

    // Copy so a caller cannot mutate the engine's own list
    return PLATFORMS.slice();

  },


  /********************************************************************
  Return the emitter table for one platform.

  @param {String} platform - Platform name

  @return {Object} - Map of token group to emitter function
  *********************************************************************/
  forPlatform: function (platform) {

    // Selection is by exact name; the caller validates before reaching here
    return _Emit.tables()[platform];

  },


  /********************************************************************
  Project one resolved value onto one platform.

  @param {*} value - Canonical value from resolution
  @param {String} group - Token group naming which emitter applies
  @param {String} platform - Target platform
  @param {Object} context - Per-call emit context
  @param {Number} context.base_font_size - Root size for rem conversion
  @param {String} context.token - Token name, for loss reports
  @param {Object[]} context.lossy - Collector for reported losses

  @return {*} - The projected value
  *********************************************************************/
  value: function (value, group, platform, context) {

    // An unrecognized group passes through untouched rather than becoming undefined
    const table = _Emit.tables()[platform];
    const emitter = table[group];

    if (!emitter) {
      return value;
    }

    // Project through the group's own emitter
    return emitter(value, context);

  }

};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Emit = {

  /********************************************************************
  Build the per-platform emitter tables.

  @return {Object} - Map of platform name to emitter table
  *********************************************************************/
  tables: function () {

    // Assembled on demand so the colour part is available by call time
    return {
      web: _Emit.webTable(),
      native: _Emit.nativeTable()
    };

  },


  /********************************************************************
  Emitters for the web target.

  @return {Object} - Map of token group to emitter function
  *********************************************************************/
  webTable: function () {

    return {

      colour: function (v) {
        return v;
      },

      dimension: function (v, ctx) {
        return (v / ctx.base_font_size) + 'rem';
      },

      fontSize: function (v, ctx) {
        return (v / ctx.base_font_size) + 'rem';
      },

      letterSpacing: function (v) {
        return v + 'px';
      },

      duration: function (v) {
        return v + 'ms';
      },

      easing: function (v) {
        return 'cubic-bezier(' + v.join(', ') + ')';
      },

      raw: function (v) {
        return v;
      },

      shadow: _Emit.webShadow,

      typeSet: _Emit.webTypeSet

    };

  },


  /********************************************************************
  Emitters for the React Native target.

  @return {Object} - Map of token group to emitter function
  *********************************************************************/
  nativeTable: function () {

    return {

      colour: function (v) {
        return v;
      },

      dimension: function (v) {
        return v;
      },

      fontSize: function (v) {
        return v;
      },

      letterSpacing: function (v) {
        return v;
      },

      duration: function (v) {
        return v;
      },

      easing: function (v) {
        return v;
      },

      raw: function (v) {
        return v;
      },

      shadow: _Emit.nativeShadow,

      typeSet: _Emit.nativeTypeSet

    };

  },


  /********************************************************************
  Project a shadow onto CSS.

  Web is the only one of the three targets that can express a
  layered shadow, so every layer survives. CSS paints the first
  layer on top.

  @param {Object} v - Canonical shadow value
  @param {Object[]} v.layers - Ordered shadow layers

  @return {String} - CSS box-shadow value
  *********************************************************************/
  webShadow: function (v) {

    // Render each layer, dropping the spread slot only when it is zero
    const rendered = v.layers.map(function (l) {

      const parts = [
        l.offset_x + 'px',
        l.offset_y + 'px',
        l.blur + 'px',
        (l.spread ? l.spread + 'px' : null),
        Color.rgbaFrom(l.color, l.opacity)
      ];

      return parts.filter(Boolean).join(' ');

    });

    // Comma-join so the browser paints them as one stacked shadow
    return rendered.join(', ');

  },


  /********************************************************************
  Project a shadow onto React Native.

  One object carries both families: iOS reads the shadow properties
  and ignores elevation, Android reads elevation and ignores the
  rest. That tolerance is what keeps the shadow group at two emit
  targets instead of three.

  @param {Object} v - Canonical shadow value
  @param {Object[]} v.layers - Ordered shadow layers
  @param {Number} v.elevation - Android elevation seed
  @param {Object} ctx - Emit context carrying the loss collector

  @return {Object} - React Native style fragment
  *********************************************************************/
  nativeShadow: function (v, ctx) {

    // iOS supports one shadow, so keep the layer whose blur carries the height cue
    const dominant = v.layers.reduce(function (acc, l) {
      return (l.blur > acc.blur) ? l : acc;
    }, v.layers[0]);

    // Record what this projection could not carry
    _Emit.reportShadowLoss(v, ctx);

    return {
      shadowColor: dominant.color,
      shadowOffset: { width: dominant.offset_x, height: dominant.offset_y },
      shadowRadius: dominant.blur,
      shadowOpacity: dominant.opacity,
      elevation: v.elevation
    };

  },


  /********************************************************************
  Report the facts a native shadow projection discards.

  A value that vanishes with no record is the failure this reporting
  exists to prevent.

  @param {Object} v - Canonical shadow value
  @param {Object} ctx - Emit context carrying the loss collector

  @return {void}
  *********************************************************************/
  reportShadowLoss: function (v, ctx) {

    // Nothing to report when the caller did not ask for a loss list
    if (!ctx.lossy) {
      return;
    }

    // Collapsing layers loses every layer but one
    if (v.layers.length > 1) {
      ctx.lossy.push({
        token: ctx.token,
        fact: 'layers',
        reason: 'React Native supports one shadow, so ' + v.layers.length + ' layers collapsed to the one with the greatest blur'
      });
    }

    // Spread has no React Native equivalent, so each non-zero value is dropped
    for (let i = 0; i < v.layers.length; i++) {
      if (v.layers[i].spread) {
        ctx.lossy.push({
          token: ctx.token,
          fact: 'spread',
          reason: 'spread has no React Native equivalent, so ' + v.layers[i].spread + ' was discarded'
        });
      }
    }

  },


  /********************************************************************
  Project a type set onto CSS.

  @param {Object} v - Canonical type set
  @param {Object} ctx - Emit context carrying the root font size

  @return {Object} - CSS-ready declaration block
  *********************************************************************/
  webTypeSet: function (v, ctx) {

    // Size and spacing carry units; the line height stays a bare ratio
    const out = {
      fontSize: (v.fontSize / ctx.base_font_size) + 'rem',
      lineHeight: String(v.lineHeight),
      letterSpacing: v.letterSpacing + 'px'
    };

    // A type set may legitimately leave the weight unset, so the key is
    // omitted rather than emitted empty. CSS then inherits, which is what a
    // partial type set is asking for.
    if (v.fontWeight !== undefined) {
      out.fontWeight = v.fontWeight;
    }

    // Passed through untranslated: this is a token for the font module to
    // resolve, not a family name this engine is entitled to interpret.
    if (v.fontFamily !== undefined) {
      out.fontFamily = v.fontFamily;
    }

    return out;

  },


  /********************************************************************
  Project a type set onto React Native.

  React Native needs an absolute line height rather than a ratio.
  Because a type set resolves to one object, the font size that the
  line height depends on is already present, with no sibling lookup.

  @param {Object} v - Canonical type set

  @return {Object} - React Native text style fragment
  *********************************************************************/
  nativeTypeSet: function (v) {

    // Multiply the ratio out, since React Native reads line height in points
    const out = {
      fontSize: v.fontSize,
      lineHeight: Math.round(v.fontSize * v.lineHeight),
      letterSpacing: v.letterSpacing
    };

    // Stringify only a weight that exists. Applied blindly, String() turns an
    // absent weight into the literal 'undefined', which React Native would
    // then try to parse as a weight.
    if (v.fontWeight !== undefined) {
      out.fontWeight = String(v.fontWeight);
    }

    // Same token, unmodified. React Native resolves a family by exact
    // registered name, so the font module maps the token to that name;
    // guessing here would produce a name nothing has registered.
    if (v.fontFamily !== undefined) {
      out.fontFamily = v.fontFamily;
    }

    return out;

  }

};/////////////////////////// Private Functions END /////////////////////////////
