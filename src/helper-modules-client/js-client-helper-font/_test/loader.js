import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import fontLoader from 'helper-font';

const Utils = utilsLoader();
const Debug = debugLoader({ Utils: Utils });

const Font = fontLoader({
  Utils: Utils,
  Debug: Debug
});

export default {
  Font: Font,
  Utils: Utils,
  Debug: Debug
};
