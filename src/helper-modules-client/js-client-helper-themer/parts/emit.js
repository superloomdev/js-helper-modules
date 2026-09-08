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
// Loader pattern: FACTORY part. Lib, CONFIG, and ERRORS are captured per call
// from the uniform parts signature; each public object closes over its own values.


// Platforms this engine emits for. React Native renders one boxShadow style prop
// on iOS and Android alike, so the two native targets share one emitter.
const PLATFORMS = ['web', 'native'];


// Emitter group names, frozen so the validator and the tables cannot drift apart.
// Exported through the public Emit interface as groups().
const GROUPS = Object.freeze(['color', 'dimension', 'fontSize', 'letterSpacing', 'duration', 'easing', 'typeSet', 'shadow', 'raw', 'spring', 'viewport']);


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory part loader. Captures the uniform part dependencies plus
the color part and returns an isolated Emit object.

@param {Object} shared_libs - Lib container with Utils and the Color part
@param {Object} config - Merged config from the parent module
@param {Object} errors - Frozen error catalog from the parent module

@return {Object} - Public Emit interface
*********************************************************************/
export default function loader (shared_libs, config, errors) {

  // Capture local bindings so this instance's public object can close over them
  const Lib = shared_libs;
  const CONFIG = config;
  const ERRORS = errors;

  // The color part rides in on the container, keeping the parts signature uniform
  const Color = shared_libs.Color;

  return createInterface(Lib, CONFIG, ERRORS, Color);

};/////////////////////////// Module-Loader END ////////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Build the emit interface for one engine instance.

@param {Object} Lib - Dependency container with Utils
@param {Object} CONFIG - Merged config for this instance
@param {Object} ERRORS - Frozen error catalog
@param {Object} Color - Color part for shadow color validation

@return {Object} - Public Emit interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Color) {

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
    List the emitter group names this engine recognizes.

    @return {String[]} - Group names, frozen
    *********************************************************************/
    groups: function () {

      // Already frozen, so returning the reference is safe
      return GROUPS;

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

      // Assembled on demand so the color part is available by call time
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

        color: function (v) {
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
          if (Lib.Utils.isObject(v) && !Array.isArray(v) && v.segments === true) {
            return v;
          }
          return 'cubic-bezier(' + v.join(', ') + ')';
        },

        raw: function (v) {
          return v;
        },

        spring: function (v) {
          return v;
        },

        viewport: function (v) {
          return v.vw + 'vw';
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

        color: function (v) {
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

        spring: function (v) {
          return v;
        },

        viewport: function (v) {
          return v;
        },

        shadow: _Emit.nativeShadow,

        typeSet: _Emit.nativeTypeSet

      };

    },


    /********************************************************************
    Render a canonical shadow as one CSS shadow list.

    Every layer survives; CSS and React Native paint the first layer
    on top. The spread slot is written only when it is non-zero, and
    the inset keyword only when the layer asks for it.

    @param {Object} v - Canonical shadow value
    @param {Object[]} v.layers - Ordered shadow layers

    @return {String} - Comma-joined shadow list
    *********************************************************************/
    shadowList: function (v) {

      // Render each layer in CSS order: inset, offsets, blur, spread, color
      const rendered = v.layers.map(function (l) {

        // Validate the color through the Color part so a malformed value is caught here
        Color.parseHex(l.color);

        const parts = [
          (l.inset ? 'inset' : null),
          l.x + 'px',
          l.y + 'px',
          l.blur + 'px',
          (l.spread ? l.spread + 'px' : null),
          l.color
        ];

        return parts.filter(Boolean).join(' ');

      });

      // Comma-join so the renderer paints them as one stacked shadow
      return rendered.join(', ');

    },


    /********************************************************************
    Project a shadow onto CSS. Every layer survives as one box-shadow list.

    @param {Object} v - Canonical shadow value
    @param {Object[]} v.layers - Ordered shadow layers

    @return {String} - CSS box-shadow value
    *********************************************************************/
    webShadow: function (v) {

      // Web takes the list as the box-shadow value itself
      return _Emit.shadowList(v);

    },


    /********************************************************************
    Project a shadow onto React Native.

    React Native 0.76 and later render the boxShadow style prop on iOS
    and Android with every layer, spread, and inset preserved, so the
    native projection carries the same list the web projection does
    and reports no loss.

    @param {Object} v - Canonical shadow value
    @param {Object[]} v.layers - Ordered shadow layers

    @return {Object} - React Native style fragment
    *********************************************************************/
    nativeShadow: function (v) {

      // One style prop carries the whole list on both native platforms
      return {
        boxShadow: _Emit.shadowList(v)
      };

    },


    /********************************************************************
    Project a type set onto CSS.

    @param {Object} v - Canonical type set
    @param {Object} ctx - Emit context carrying the root font size

    @return {Object} - CSS-ready declaration block
    *********************************************************************/
    webTypeSet: function (v, ctx) {

      // Size carries units while ratio line height remains a bare ratio
      const out = {
        fontSize: (v.fontSize / ctx.base_font_size) + 'rem'
      };
      if (v.lineHeightPx !== undefined) {
        out.lineHeight = (v.lineHeightPx / ctx.base_font_size) + 'rem';
      } else if (v.lineHeight !== undefined) {
        out.lineHeight = String(v.lineHeight);
      }
      if (v.letterSpacing !== undefined) {
        out.letterSpacing = v.letterSpacing + 'px';
      }

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

      // v2 C4: per-breakpoint overrides, each emitted through the same projection
      if (v.breakpoints !== undefined) {
        out.breakpoints = {};
        const bpKeys = Object.keys(v.breakpoints);
        for (let i = 0; i < bpKeys.length; i++) {
          out.breakpoints[bpKeys[i]] = _Emit.webTypeSet(v.breakpoints[bpKeys[i]], ctx);
        }
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

      // Preserve exact absolute line height; retain the rounded ratio behavior
      const out = {
        fontSize: v.fontSize
      };
      if (v.lineHeightPx !== undefined) {
        out.lineHeight = v.lineHeightPx;
      } else if (v.lineHeight !== undefined) {
        out.lineHeight = Math.round(v.fontSize * v.lineHeight);
      }
      if (v.letterSpacing !== undefined) {
        out.letterSpacing = v.letterSpacing;
      }

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

      // v2 C4: per-breakpoint overrides, each emitted through the same projection
      if (v.breakpoints !== undefined) {
        out.breakpoints = {};
        const bpKeys = Object.keys(v.breakpoints);
        for (let i = 0; i < bpKeys.length; i++) {
          out.breakpoints[bpKeys[i]] = _Emit.nativeTypeSet(v.breakpoints[bpKeys[i]]);
        }
      }

      return out;

    }

  };/////////////////////////// Private Functions END /////////////////////////////



  // Return the instance's isolated emit interface
  return Emit;

};/////////////////////////// createInterface END //////////////////////////////
