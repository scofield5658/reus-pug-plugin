const path = require('path');
const url = require('url');
const minify = require('html-minifier');
const pug = require('pug');
const handleManifest = require('reus-jagger-plugin/src/loaders/manifest');
const handleAsset = require('reus-jagger-plugin/src/loaders/asset');
const handleReferer = require('reus-jagger-plugin/src/loaders/referer');
const handleSsr = require('reus-jagger-plugin/src/loaders/ssr');
const getUtils = require('./helpers/utils');
const handleAssetHelper = require('./helpers/asset')

module.exports = function(workdir, config) {
  const {srcRoute, srcUrl, writefile, abssrc, abstmp, absdest, abs2rel, tgtURL} = getUtils(config, workdir);
  const appConfig = require(path.join(workdir, (!process.env.REUS_PROJECT_ENV || process.env.REUS_PROJECT_ENV === 'dev') ? 'src' : 'dist', 'app.config'));
  const routes = appConfig.routers.map(v => Object.assign({}, v, { path: tgtURL(v.path) }));
  if (routes === undefined) {
    throw 'routers not found in app.config.js';
  }

  const manifest = handleManifest(workdir, config);
  const referer = handleReferer(workdir, config);
  const ssr = handleSsr(workdir, config);
  const asset = handleAssetHelper(handleAsset(workdir, config));

  const getRoute = (route) => {
    for (const { path: name } of routes) {
      const regexp = new RegExp(`^${name}`, 'gi');
      regexp.lastIndex = 0;
      if (regexp.test(route)) {
        return name;
      }
    }
    throw 'not found';
  };

  const getRenderParams = ({ title = 'jagger', html = '', state = {}, enable = false }) => {
    return {
      title,
      __SSR__: enable,
      __HTML__: html,
      __STATE__: JSON.stringify(state)
    };
  };

  return async function(ctx, viewpath, data) {
    const route = srcRoute(getRoute(url.parse(ctx.req.url).pathname));
    const { ssr: ssrConfig, title } = data;
    let viewData = {};

    const queries = ctx.query || {};
    if (ssrConfig && ((process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev') || queries.__ssr)) {
      const { type, entry } = ssrConfig;
      const { html, state, enable } = await ssr[type]({ entry, route: ctx.req.url });
      viewData = await getRenderParams({ title, html, state, enable });
    } else {
      viewData = await getRenderParams({ title });
    }

    if ((config.mirage && config.mirage.enable)
      && (process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev')) {
      Object.assign(viewData, {
        __CACHES__: JSON.stringify(
          referer.next({route, limit: config.mirage.limit})
            .reduce((files, route) => {
              files = files.concat(route.files.map(tgtURL));
              return files;
            }, [])
        )
      });
    }

    let html = null;
    if (!process.env.REUS_PROJECT_ENV || process.env.REUS_PROJECT_ENV === 'dev') {
      asset.html.rels(abssrc(viewpath))
        .forEach((rel) => {
          writefile(abstmp(abs2rel(rel)), asset.html.link(rel));
        });

      html = pug.compileFile(abstmp(viewpath))(viewData);
    } else {
      html = pug.compileFile(absdest(viewpath))(viewData);
    }

    const tags = [
      {
        tagname: 'css',
        from: '<!-- CSS_FILE -->',
        to: '<link rel="stylesheet" type="text/css" href="$SRC"/>'
      },
      {
        tagname: 'js',
        from: '<!-- JS_FILE -->',
        to: '<script type="text/javascript" src="$SRC"></script>'
      }
    ];

    // collect res
    if (!process.env.REUS_PROJECT_ENV || process.env.REUS_PROJECT_ENV === 'dev') {
      //manifest.pages.remove(route);
      manifest.pages.set(route, 'html', viewpath);

      for (const {tagname} of tags) {
        const urls = asset.tags.parse(tagname, html).map(asset.link.stringify);
        manifest.pages.set(route, tagname, urls.map(srcUrl));
      }
    }

    // delete tags
    for (const {tagname} of tags) {
      html = html.replace(new RegExp(`<${tagname} ([^>]+)></${tagname}>`, 'gmi'), '');
    }

    // attach res
    for (const {tagname, from, to} of tags) {
      const urls = manifest.pages.get(route, tagname) || [];
      html = html.replace(from, urls.reduce((links, url) => {
        links.push(to.replace('$SRC', `${tgtURL(url)}`));
        return links;
      }, []).join('\r\n'));
    }

    ctx.type = 'text/html;charset=utf-8';
    ctx.body = (!process.env.REUS_PROJECT_ENV || process.env.REUS_PROJECT_ENV === 'dev') ?
      html : minify.minify(html, {
        conservativeCollapse: true,
        removeAttributeQuotes: true,
        collapseWhitespace: true,
        ignoreCustomComments: true
      });

    // record referer
    if ((config.mirage && config.mirage.enable)
      && (process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev')) {
      const ref = ctx.req.headers['referer'];
      if (ref) {
        const refRoute = srcRoute(url.parse(ref).pathname);
        if (route == refRoute) {
          return;
        }

        referer.dot({
          route: refRoute,
          next: route
        });
      }
    }
  };
};
