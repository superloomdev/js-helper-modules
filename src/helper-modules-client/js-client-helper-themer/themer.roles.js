// Info: Role rules for helper-themer: what a complete, usable theme must hold
// between its color roles, whatever design system filled them. A template
// test runs these over every built scheme (`auditRoles`) so a value that
// would draw an unreadable label or a danger button that looks disabled is
// caught at the template, before any component draws it.
//
// Three kinds of rule:
//   contrast - a content role drawn on a surface role meets a minimum ratio
//              (WCAG 1.4.3: 4.5 for text, 3.0 for large text and boundaries);
//              a translucent content color is composited on the surface first
//   distinct - two roles that mean different things must not share a value
//              (a disabled fill equal to a danger fill is a danger button
//              that reads as disabled); under highlight press feedback a
//              hover or active fill must also differ from its rest fill
//   shadow   - every shadow level is drawn translucent; an opaque shadow is
//              a hard ring, not a lift
//
// Placeholder text is deliberately absent from the contrast rules: one
// reference system draws it below 4.5 by design, and the component gates
// hold that as a declared exception per template.


// The role grid's button kinds and the states a label is read in over its fill
const BUTTON_KINDS = Object.freeze(['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'danger_tertiary', 'danger_ghost', 'tonal', 'elevated']);
const LABEL_STATES = Object.freeze(['', '_hover', '_active', '_focus', '_selected']);
// Kinds whose rest container is a fill (not transparent): their fill must differ from the disabled fill
const FILLED_KINDS = Object.freeze(['primary', 'secondary', 'danger', 'tonal', 'elevated']);


// ~~~~~~~~~~~~~~~~~~~~ Contrast ~~~~~~~~~~~~~~~~~~~~
// [content, surface, minimum ratio]; a translucent or transparent surface is
// read over the page background

const CONTRAST = Object.freeze([
  // Text on the page and its layers
  ['color.text_primary', 'color.background', 4.5],
  ['color.text_secondary', 'color.background', 4.5],
  ['color.text_helper', 'color.background', 4.5],
  ['color.text_error', 'color.background', 4.5],
  ['color.text_primary', 'color.layer_01', 4.5],
  ['color.text_secondary', 'color.layer_01', 4.5],
  ['color.text_primary', 'color.field_01', 4.5],
  ['color.text_error', 'color.field_01', 4.5],
  ['color.text_helper', 'color.field_01', 4.5],
  ['color.text_inverse', 'color.background_inverse', 4.5],
  ['color.link_primary', 'color.background', 4.5],
  // Button labels on their fills
  ['color.text_on_color', 'color.button_primary', 4.5],
  ['color.text_on_color', 'color.button_secondary', 4.5],
  ['color.text_on_color', 'color.button_danger_primary', 4.5],
  ['color.text_on_button_tonal', 'color.button_tonal', 4.5],
  ['color.link_primary', 'color.button_elevated', 4.5],
  // Outlined and inline kinds draw their label in the role color on the page
  ['color.button_tertiary', 'color.background', 4.5],
  ['color.button_danger_secondary', 'color.background', 4.5],
  // Selected surface with the primary text on it
  ['color.text_primary', 'color.background_selected', 4.5],
  // Icons and boundaries
  ['color.icon_primary', 'color.background', 3.0],
  ['color.icon_on_color', 'color.button_primary', 3.0],
  ['color.support_error', 'color.background', 3.0],
  ['color.support_error', 'color.field_01', 3.0],
  ['color.border_strong_01', 'color.background', 3.0],
  ['color.border_interactive', 'color.background', 3.0],
  ['color.focus', 'color.background', 3.0],
  // Role grid: every button label over its own fill, in every state it is read in
  ...BUTTON_KINDS.flatMap(function (kind) {
    return LABEL_STATES.map(function (state) {
      return ['color.button_' + kind + '_label' + state, 'color.button_' + kind + '_container' + state, 4.5];
    });
  }),
  // Role grid: field text, messages and boundaries
  ['color.field_value', 'color.field_container', 4.5],
  ['color.field_helper', 'color.background', 4.5],
  ['color.field_message_invalid', 'color.background', 4.5],
  ['color.field_outline', 'color.background', 3.0],
  ['color.field_indicator', 'color.field_container', 3.0],
  ['color.selection_outline', 'color.background', 3.0],
  ['color.selection_mark', 'color.selection_container', 3.0],
  ['color.selection_label', 'color.background', 4.5]
]);


// ~~~~~~~~~~~~~~~~~~~~ Distinct ~~~~~~~~~~~~~~~~~~~~
// [role, role] that must not resolve to one value

const DISTINCT = Object.freeze([
  // Enabled fills against the disabled fill
  ['color.button_primary', 'color.button_disabled'],
  ['color.button_secondary', 'color.button_disabled'],
  ['color.button_danger_primary', 'color.button_disabled'],
  ['color.button_tonal', 'color.button_disabled'],
  // Outlined and inline label colors against disabled text
  ['color.button_tertiary', 'color.text_disabled'],
  ['color.button_danger_secondary', 'color.text_disabled'],
  ['color.link_primary', 'color.text_disabled'],
  ['color.text_primary', 'color.text_disabled'],
  ['color.icon_primary', 'color.icon_disabled'],
  // Danger is not the neutral kind
  ['color.button_danger_primary', 'color.button_primary'],
  ['color.button_danger_primary', 'color.button_secondary'],
  ['color.button_danger_secondary', 'color.button_tertiary'],
  // Error reads as error, not as plain text or a plain border
  ['color.text_error', 'color.text_primary'],
  ['color.text_error', 'color.text_secondary'],
  ['color.support_error', 'color.icon_primary'],
  ['color.support_error', 'color.border_strong_01'],
  // Inverse is the other polarity
  ['color.background_inverse', 'color.background'],
  ['color.icon_inverse', 'color.icon_primary'],
  // A selected surface shows
  ['color.background_selected', 'color.background'],
  // Role grid: an enabled label (kinds drawn on the page) or fill (filled kinds) never equals its disabled one
  ...BUTTON_KINDS.filter(function (kind) {
    return !FILLED_KINDS.includes(kind);
  }).map(function (kind) {
    return ['color.button_' + kind + '_label', 'color.button_' + kind + '_label_disabled'];
  }),
  ...FILLED_KINDS.map(function (kind) {
    return ['color.button_' + kind + '_container', 'color.button_' + kind + '_container_disabled'];
  }),
  ['color.field_value', 'color.field_value_disabled'],
  ['color.selection_container', 'color.selection_container_disabled'],
  ['color.selection_outline', 'color.selection_outline_disabled']
]);


// ~~~~~~~~~~~~~~~~~~~~ Distinct under highlight ~~~~~~~~~~~~~~~~~~~~
// [role, role] that must differ when the theme shows hover and press by
// swapping fills (`feedback.press: highlight`); under a state layer or an
// opacity fade the fills are not what changes, so these do not apply

const DISTINCT_HIGHLIGHT = Object.freeze([
  ['color.background_hover', 'color.background'],
  ['color.background_active', 'color.background'],
  ['color.button_primary_hover', 'color.button_primary'],
  ['color.button_primary_active', 'color.button_primary'],
  ['color.button_secondary_hover', 'color.button_secondary'],
  ['color.button_danger_hover', 'color.button_danger_primary'],
  ['color.button_tertiary_hover', 'color.background'],
  ['color.button_tonal_hover', 'color.button_tonal']
]);


// ~~~~~~~~~~~~~~~~~~~~ Shadow ~~~~~~~~~~~~~~~~~~~~
// Shadow levels whose every layer color must be translucent

const SHADOW_LEVELS = Object.freeze([
  'shadow.level_01', 'shadow.level_02', 'shadow.level_03', 'shadow.level_04', 'shadow.level_05'
]);


export default Object.freeze({
  contrast: CONTRAST,
  distinct: DISTINCT,
  distinct_highlight: DISTINCT_HIGHLIGHT,
  shadow_levels: SHADOW_LEVELS
});
