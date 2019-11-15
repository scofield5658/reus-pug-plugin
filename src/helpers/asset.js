const fs = require('fs');
const path = require('path');
const getUtils = require('./utils');

module.exports = function(assetJagger) {
  const asset = {
    html: {
      rels: (filepath) => {
        return assetJagger.html.rels(filepath, [
          '\\s*extends\\s*(\\S+\\.pug)$',
          '\\s*include\\s*(\\S+\\.pug)$'
        ]);
      },
      link: (filepath) => {
        return assetJagger.html.link(filepath, [
          {
            match: '(\\w+\\().*src=.*\\)$',
            from: 'src=[\'"]?([^\'"]+)[\'"]?',
            to: 'src="$TO"'
          },
          {
            match: '(link\\().*href=.*\\)$',
            from: 'href=[\'"]?([^\'"]+)[\'"]?',
            to: 'href="$TO"'
          },
          {
            match: '(\\w+\\().*url=.*\\)$',
            from: 'url\\([\'"]?([^\'")]+)[\'"]?\\)',
            to: 'url($TO)'
          }
        ]);
      }
    },
    tags: {
      parse(tagname, content) {
        const tags = [];
        const reg = new RegExp(`${tagname}\\((.*)\\)$`, 'gmi');

        {
          let exec = reg.exec(content);
          while (exec) {
            const props = {};
            const kvs = exec[1].split(/\s+/);
            for (const kv of kvs) {
              const matches = kv.match(/(\w+)=['"]+(\S+)['"]+/);
              if (matches) {
                const key = matches[1].toLowerCase();
                const val = matches[2];

                props[`__${key}`] = val;
              }
            }
            tags.push(props);
            exec = reg.exec(content);
          }
        }
        return tags;
      },
    }
  }

  return asset;
}
