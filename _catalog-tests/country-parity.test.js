// Info: Country parity drift guard for the basic contact adapters.
// The contact family deliberately ships no shared country module, so each
// basic adapter carries its own generated country table. Two tables that
// are regenerated from different source versions can silently disagree on
// which countries exist, which makes a country valid for a phone number and
// unknown for an address in the same application. This guard is the thing
// that stops that going unnoticed.
//
// This guard runs at the catalog tier, not inside either module's test
// suite. Both adapters are installed from the registry after both have
// published, so neither package's publish gate depends on the other. The
// previous module-tier packaging created a registry cycle that deadlocked
// every full republish; moving the guard here breaks that cycle without
// weakening the invariant.


import { test } from 'node:test';
import assert from 'node:assert/strict';

import utilsLoader from 'helper-utils';
import phoneAdapterBasicLoader from 'helper-contact-phone-adapter-basic';
import addressAdapterBasicLoader from 'helper-contact-address-adapter-basic';

const Lib = {};
Lib.Utils = utilsLoader(Lib, {});

const PhoneAdapter = phoneAdapterBasicLoader(Lib, {});
const AddressAdapter = addressAdapterBasicLoader(Lib, {});



// ~~~~~~~~~~~~~~~~~~~~ Country Parity ~~~~~~~~~~~~~~~~~~~~

test('phone and address basic adapters serve an identical country set', function () {

  // Compare through the public contract, not the generated file, because
  // listCountries is what a consumer actually sees
  const phone_countries = PhoneAdapter.listCountries().slice().sort();
  const address_countries = AddressAdapter.listCountries().slice().sort();

  // Report the specific divergence rather than a bare deepEqual failure
  const only_phone = phone_countries.filter(function (code) {
    return address_countries.indexOf(code) === -1;
  });

  const only_address = address_countries.filter(function (code) {
    return phone_countries.indexOf(code) === -1;
  });

  assert.deepEqual(only_phone, [], 'countries in phone but not address: ' + only_phone.join(', '));
  assert.deepEqual(only_address, [], 'countries in address but not phone: ' + only_address.join(', '));

  // Belt and braces: the sets are identical, so the lists must be too
  assert.deepEqual(phone_countries, address_countries);

});


test('both basic adapters report a non-trivial country set', function () {

  // A guard comparing two empty lists would pass while proving nothing
  assert.ok(PhoneAdapter.listCountries().length > 200);
  assert.ok(AddressAdapter.listCountries().length > 200);

});
