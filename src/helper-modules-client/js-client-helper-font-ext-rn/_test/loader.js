import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import fontLoader from 'helper-font';
import fontExtRnLoader from 'helper-font-ext-rn';

const Utils = utilsLoader();
const Debug = debugLoader({ Utils: Utils });
const Font = fontLoader({ Utils: Utils, Debug: Debug });

// Register example families with path (native extensions require local files)
Font.registerFamilies({
  Poppins: {
    styles: {
      '400': { path: '/app/fonts/poppins-400.ttf' },
      '600': { path: '/app/fonts/poppins-600.ttf' }
    }
  },
  Lora: {
    path: '/app/fonts/lora-regular.ttf',
    weight: '400'
  }
});

// The native loader stub is aliased via _test/package.json and the parent
// package.json devDependencies. The extension requires it directly at module
// scope - no injection needed.

// Build the adapter - no NativeFontLoader injection needed
const RNFontAdapter = fontExtRnLoader({
  Utils: Utils,
  Debug: Debug,
  Font: Font
});


export {
  RNFontAdapter,
  Font,
  Utils,
  Debug
};
