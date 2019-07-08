const path = require('path');
const fs = require('fs');
const handleAsset = require('./asset');
const getUtils = require('../helpers/utils');

const getSourceDir = function(forceSrc = false) {
  if (forceSrc) {
    return 'src';
  }
  return !process.env.REUS_PROJECT_ENV || process.env.REUS_PROJECT_ENV === 'dev' ? 'src' : 'dist';
}

module.exports = function(workdir, config, useSourceForce = false) {
  const { isEmpty } = getUtils(config, workdir);
  const asset = handleAsset(workdir, config);
  const appConfig = require(path.join(workdir, getSourceDir(useSourceForce), 'app.config'));
  const routes = appConfig.routers;
  if (routes === undefined) {
    throw 'routers not found in app.config.js';
  }
  const filepath = path.join(workdir, getSourceDir(useSourceForce), 'manifest.json');
  const manifest = (function() {
    const manifest = require(filepath);
    const maps = {};
    routes.forEach(function(route) {
      maps[route.path] = route;
    });

    const pages = manifest.pages || {};
    for (const page in pages) {
      if (!maps[page]) {
        delete pages[page];
      }
    }
    fs.writeFileSync(filepath, JSON.stringify(manifest, null, 2));
    return manifest;
  })();

  const getData = function(key, obj = {}) {
    const props = key.split('.');
    const val = obj[props[0]];
    if (props.length == 1) {
      return val;
    }

    return getData(props.slice(1).join('.'), val || {});
  };

  const setData = function(key, val, obj = {}) {
    const props = key.split('.');
    if (props.length == 1) {

      if (isEmpty(val)) {

        delete obj[props[0]];
      } else {
        obj[props[0]] = val;
      }

      fs.writeFileSync(filepath, JSON.stringify(manifest, null, 2));
      return;
    }

    setData(props.slice(1).join('.'), val, obj[props[0]] || (obj[props[0]] = {}));
  };

  return {
    pages: {
      routes() {
        return getData('pages', manifest);
      },
      get(route, key) {
        const val = getData(`pages.${route}.${key}`, manifest);
        if (val) {
          return val;
        }

        const mainfestRoutes = this.routes();
        for (const item of routes) {
          if (!mainfestRoutes[item.path]) {
            continue;
          }

          if (item.path == '*') {
            return getData(`pages.*.${key}`, manifest);
          }
          if ((new RegExp(`$${item.path}`)).test(route)) {
            return getData(`pages.${item.path}.${key}`, manifest);
          }
        }
      },
      set(route, key, val) {
        return setData(`pages.${route}.${key}`, val, manifest);
      },
      remove(route) {
        return setData(`pages.${route}`, void 0, manifest);
      },
      chunks(route, key) {
        const files = getData(`pages.${route}.${key}`, manifest) || [];
        return files.reduce(function(chunks, file) {

          const {__chunk = 'app'} = asset.link.parse(file);
          chunks[__chunk] = chunks[__chunk] || (chunks[__chunk] = []);
          chunks[__chunk].push(file);

          return chunks;
        }, {});
      }
    },
    externals: {
      get() {
        return getData('externals', manifest) || {};
      }
    }
  };
};
