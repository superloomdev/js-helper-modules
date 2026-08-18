// Info: Configuration file for helper-contact-address
'use strict';


module.exports = {

  // Default field policy. Two states only: 'required' and 'optional'.
  // No 'hidden' state - UI visibility is an application concern.
  FIELD_POLICY: {
    line_1:      'required',
    line_2:      'optional',
    landmark:    'optional',
    locality:    'required',
    subdivision: 'required',
    postal_code: 'required',
    country:     'required',
    coordinates: 'optional',
    label:       'optional',
    tag:         'optional',
    metadata:    'optional'
  },

  // Field length bounds
  FIELD_LENGTHS: {
    line_1:      { min: 1,  max: 200 },
    line_2:      { min: 0,  max: 200 },
    landmark:    { min: 0,  max: 100 },
    locality:    { min: 1,  max: 100 },
    subdivision: { min: 1,  max: 50 },
    postal_code: { min: 0,  max: 20 },
    country:     { min: 2,  max: 2 },   // ISO 3166-1 alpha-2
    label:       { min: 0,  max: 50 }
  },

  // Valid tag values
  VALID_TAGS: ['home', 'work', 'other'],

  // Coordinate bounds (decimal degrees)
  LATITUDE_MIN:  -90,
  LATITUDE_MAX:   90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX:  180,

  // Characters stripped from sanitized postal code
  POSTAL_SANITIZE_REGEX: /[^a-zA-Z0-9 -]/g

};
