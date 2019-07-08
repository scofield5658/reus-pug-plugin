const getUtils = require('../helpers/utils');
const loaderConfigs = require('../configs/loader');

const loaders = loaderConfigs.loaders
  .map(function(loader) {
    return Object.assign({}, loader, { loader: require(`../${loader.loader}`) });
  })
  .reduce(function(loaders, loader) {
    loaders[loader.fromext] = loader;
    return loaders;
  }, {});

module.exports = function(workdir, config) {
  const {getExtname, abssrc} = getUtils(config, workdir);
  return {
    test({pathname}) {
      const extname = getExtname(pathname);
      if (!extname) {
        return false;
      }

      return !!loaders[extname];
    },
    compile: async function({pathname, target, referer, extract, library}) {
      const extname = getExtname(pathname);
      const {type, loader} = loaders[extname];

      const res = await loader(workdir, config)({
        filepath: abssrc(pathname),
        referer,
        target,
        extract,
        library,
      });

      return Object.assign({}, res, { type });
    }
  };
};
