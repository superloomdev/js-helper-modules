// Info: Utility-style generation for js-client-helper-styler. Turns an assembled theme
// ({ Color, Dimension, Font }) into a flat map of atomic style objects (plain
// objects, not StyleSheet). Spacing is LOGICAL (start/end) for RTL. Singleton.
'use strict';


// Shared dependencies injected by loader (uniform parts signature)
let Lib;     // eslint-disable-line no-unused-vars -- accepted for signature uniformity
let CONFIG;  // eslint-disable-line no-unused-vars -- accepted for signature uniformity
let ERRORS;  // eslint-disable-line no-unused-vars -- accepted for signature uniformity


// Color tokens that receive a `font_<token>` text-color utility
const FONT_COLOR_TOKENS = [
  'TEXT_PRIMARY', 'TEXT_SECONDARY', 'TEXT_MUTED', 'TEXT_ON_PRIMARY',
  'APP_PRIMARY', 'STATUS_SUCCESS', 'STATUS_DANGER', 'STATUS_WARNING', 'STATUS_INFO'
];

// Color tokens that receive a `background_<token>` background utility
const BACKGROUND_TOKENS = [
  'APP_PRIMARY', 'APP_PRIMARY_HOVERED', 'APP_PRIMARY_PRESSED', 'APP_PRIMARY_DISABLED',
  'APP_PRIMARY_SUBTLE', 'BACKGROUND_PRIMARY', 'BACKGROUND_SECONDARY', 'SURFACE',
  'STATUS_SUCCESS', 'STATUS_SUCCESS_SUBTLE', 'STATUS_DANGER', 'STATUS_DANGER_SUBTLE',
  'STATUS_WARNING', 'STATUS_WARNING_SUBTLE', 'STATUS_INFO', 'STATUS_INFO_SUBTLE'
];

// Logical sides for spacing utilities (RTL-aware start/end)
const SPACING_SIDES = ['a', 'h', 'v', 't', 'b', 's', 'e'];


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib, CONFIG, and ERRORS and returns the
module-scope Utilities object directly. All three are accepted for
signature uniformity with other parts — none are consumed today.

@param {Object} shared_libs - Lib container (unused; pure transform)
@param {Object} config      - Merged module configuration (unused)
@param {Object} errors      - Module error catalog (unused)

@return {Object} - Public Utilities interface
*********************************************************************/
module.exports = function loader (shared_libs, config, errors) {

  // Capture injected references so they are available if a future helper needs them
  Lib = shared_libs;
  CONFIG = config;
  ERRORS = errors;

  return Utilities;

};/////////////////////////// Module-Loader END ////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Utilities = { // Utility-style generator accessible by the orchestrator


  /********************************************************************
  Generate the atomic utility stylesheet from an assembled theme.
  Returns plain objects (not StyleSheet). Spacing utilities are LOGICAL
  (start/end) so they work under RTL.

  @param {Object} theme - { Color, Dimension, Font }

  @return {Object} - flat map of utility style objects keyed by name
  *********************************************************************/
  generateUtilities: function (theme) {

    // Pull the three derived sections off the assembled theme
    const Color = theme.Color;
    const Dimension = theme.Dimension;
    const Font = theme.Font;

    const styles = {};

    // Font sizes (+ derived line-height)
    Object.keys(Dimension.fontSize).forEach(function (size_step) {
      const size = Dimension.fontSize[size_step];
      styles['font_size_' + size_step] = {
        fontSize: size,
        lineHeight: Math.round(size * Dimension.lineHeightRatio)
      };
    });

    // Font colors — one `font_<token>` per known text color present
    FONT_COLOR_TOKENS.forEach(function (token) {
      if (Color[token] !== undefined) {
        styles['font_' + token.toLowerCase()] = { color: Color[token] };
      }
    });

    // Font weights (bound to the primary family)
    Object.keys(Font.weight).forEach(function (weight_name) {
      styles['font_weight_' + weight_name] = {
        fontWeight: Font.weight[weight_name],
        fontFamily: Font.family.primary
      };
    });

    // Optional secondary family utility
    if (Font.family.secondary) {
      styles['font_family_secondary'] = { fontFamily: Font.family.secondary };
    }

    // Backgrounds — one `background_<token>` per known surface color present
    BACKGROUND_TOKENS.forEach(function (token) {
      if (Color[token] !== undefined) {
        styles['background_' + token.toLowerCase()] = { backgroundColor: Color[token] };
      }
    });

    // Borders
    styles['border_default'] = { borderWidth: 1, borderColor: Color.BORDER };
    styles['border_top'] = { borderTopWidth: 1, borderColor: Color.BORDER };
    styles['border_primary'] = { borderWidth: 1, borderColor: Color.APP_PRIMARY };

    // Radii — one `br_<step>` per radius step
    Object.keys(Dimension.radius).forEach(function (radius_step) {
      styles['br_' + radius_step] = { borderRadius: Dimension.radius[radius_step] };
    });

    // Spacing — one padding + margin utility per token per logical side
    Object.keys(Dimension.space).forEach(function (space_step) {
      const value = Dimension.space[space_step];
      SPACING_SIDES.forEach(function (side) {
        styles['p_' + side + '_' + space_step] = _Utilities.paddingFor(side, value);
        styles['m_' + side + '_' + space_step] = _Utilities.marginFor(side, value);
      });
    });

    return styles;

  }


};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Utilities = { // Logical-side style builders, module-only


  /********************************************************************
  Build a padding utility object for a logical side (start/end are
  RTL-aware).

  @param {String} side  - a|h|v|t|b|s|e (all/horizontal/vertical/top/bottom/start/end)
  @param {Number} value - padding value in px

  @return {Object} - single-property padding style ({} for unknown side)
  *********************************************************************/
  paddingFor: function (side, value) {

    // Map the side shorthand to its padding property
    switch (side) {
    case 'a': return { padding: value };
    case 'h': return { paddingHorizontal: value };
    case 'v': return { paddingVertical: value };
    case 't': return { paddingTop: value };
    case 'b': return { paddingBottom: value };
    case 's': return { paddingStart: value };
    case 'e': return { paddingEnd: value };
    default: return {};
    }

  },


  /********************************************************************
  Build a margin utility object for a logical side (start/end are
  RTL-aware).

  @param {String} side  - a|h|v|t|b|s|e (all/horizontal/vertical/top/bottom/start/end)
  @param {Number} value - margin value in px

  @return {Object} - single-property margin style ({} for unknown side)
  *********************************************************************/
  marginFor: function (side, value) {

    // Map the side shorthand to its margin property
    switch (side) {
    case 'a': return { margin: value };
    case 'h': return { marginHorizontal: value };
    case 'v': return { marginVertical: value };
    case 't': return { marginTop: value };
    case 'b': return { marginBottom: value };
    case 's': return { marginStart: value };
    case 'e': return { marginEnd: value };
    default: return {};
    }

  }


};/////////////////////////// Private Functions END ////////////////////////////
