const path = require('path');
const handleWebpack = require('./webpack');
const getUtils = require('../helpers/utils');

module.exports = function(workdir, config) {
  const { abssrc, abstmp, absdest, writefile, radom, tgtRoute } = getUtils(config, workdir);
  const appConfig = require(path.join(workdir, (!process.env.REUS_PROJECT_ENV || process.env.REUS_PROJECT_ENV === 'dev') ? 'src' : 'dist', 'app.config'));
  const routes = appConfig.routers.map(v => Object.assign({}, v, { path: tgtRoute(v.path)}));
  if (routes === undefined) {
    throw 'routers not found in app.config.js';
  }

  const webpack = handleWebpack(workdir, config);

  // pre-load ssr entry
  if (process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev') {
    for (const route in routes) {
      const {ssr: {entry} = {}} = routes[route];
      if (entry) {
        require(absdest(entry));
      }
    }
  }

  return {
    vue({entry, route}) {
      return new Promise(async function(resolve, reject) {
        try {
          const filepath = await (async function() {
            if ((process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev')) {
              return absdest(entry);
            }

            const {content} = await webpack({
              filepath: abssrc(entry),
              //referer: srcUrl(url.parse(route).pathname),
              target: 'node',
              extract: {ext: 'css'}});
            const tmppath = `${abstmp(entry)}.${radom()}.js`;

            writefile(tmppath, content);

            return tmppath;
          })();

          const {createApp} = require(filepath);
          const {app, router, store} = createApp();

          router.push(route);
          router.onReady(function() {
            const components = router.getMatchedComponents();
            if (!components.length) {
              return reject('not found');
            }

            Promise.all(components.map(function({asyncData}) {
              return asyncData && asyncData({store, route: router.currentRoute});
            })).then(async function() {
              const renderer = require('vue-server-renderer').createRenderer();
              const html = await renderer.renderToString(app);

              resolve({
                enable: true,
                html,
                state: store.state
              });

            }).catch(reject);
          }, reject);
        } catch (ex) {
          reject(ex);
        }
      });
    }
  };
};
