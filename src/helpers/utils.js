const calcMD5 = (str, len = 12) => {
  const crypto = require('crypto');
  const md5 = crypto.createHash('md5').update(str).digest('hex');
  return md5.substring(md5.length - len, md5.length);
};

const mkdirs = (dirname) => {
  const fs = require('fs');
  const path = require('path');
  const dirs = dirname.split(path.sep);
  for (let i = 1, ii = dirs.length; i < ii; i++) {
    const tmp = dirs.slice(0, i + 1).join(path.sep);
    if (!fs.existsSync(tmp)) {
      fs.mkdirSync(tmp);
    }
  }
};

const isBrowser = () => {
  return typeof window !== 'undefined';
};

const getData = (obj, key) => {
  if (obj == null) {
    return obj || null;
  }

  const props = key.split('.');
  const prop = props.shift();
  const tmp = ((obj, prop) => {
    const matches = prop.match(/(\w*)\[(\w+)\]/);
    if (!matches) {
      return obj[prop];
    }

    const tmp = matches[1] ?
      (obj[matches[1]] || []) : obj;

    // array, like d5[3]
    return tmp[matches[2]];
  })(obj, prop);

  if (props.length == 0) {
    return tmp || null;
  } else {
    return getData(tmp || null, props.join('.'));
  }
};

const setData = (obj, key, value) => {
  const props = key.split('.');
  const prop = props.shift();
  if (props.length == 0) {
    return obj[prop] = value;
  }

  //obj[prop] || (obj[prop] = {})
  const tmp = ((obj, prop) => {
    const matches = prop.match(/(\w+)\[(\w+)\]/);
    // normal obj
    if (!matches) {
      return obj[prop] || (obj[prop] = {});
    }

    // array, like d5[3]
    const key = matches[1];
    const index = matches[2];
    const arr = obj[key] || (obj[key] = []);
    return arr[index] || (arr[index] = {});
  })(obj, prop);
  return setData(tmp, props.join('.'), value);
};

module.exports = function(config, workdir) {
  return {
    noop: () => {},

    tgtRoute: (route) => {
      return (`${config.baseUrl}${route}`).replace(/\\/gmi, '/');
    },

    srcRoute: (url) => {
      return (url.replace(new RegExp(`^${config.baseUrl}`), '')).replace(/\\/gmi, '/');
    },

    tgtURL: (url) => {
      const tgtBase = (process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev') ?
        config.cdnUrl : config.baseUrl;
      return (`${tgtBase}${url.replace(/\\/gmi, '/').replace(/^\/pages/, '')}`).replace(/\\/gmi, '/');
    },

    srcUrl: (url) => {
      const tgtBase = (process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev') ?
        config.cdnUrl : config.baseUrl;
      return (url.replace(new RegExp(`^${tgtBase}`), '/pages')).replace(/\\/gmi, '/');
    },

    getExtname: (pathname) => {
      const path = require('path');
      return path.extname(pathname);
    },

    calcMD5,

    isEmpty: (val) => {
      return typeof val === 'undefined' || val === null;
    },

    isEmptyObject: (obj) => {
      if (typeof obj !== 'object') {
        return false;
      }

      for (const key in obj) {
        return false;
      }

      return true;
    },

    mkdirs,

    writefile: (filepath, content) => {
      const fs = require('fs');
      const path = require('path');
      mkdirs(path.dirname(filepath));
      fs.writeFileSync(filepath, content);
    },

    hashfile: (filepath) => {
      const fs = require('fs');
      const path = require('path');
      const buffer = fs.readFileSync(filepath);
      const hash = calcMD5(buffer);

      return {
        name: path.basename(filepath).replace(/\.\w+$/, ($0) => {
          return `.${hash}${$0}`;
        }),
        buffer
      };
    },

    cpfile: ({from, to}) => {
      const fs = require('fs');
      const path = require('path');

      mkdirs(path.dirname(to));

      fs.writeFileSync(to, fs.readFileSync(from));
    },

    rel2abs: (relpath) => {
      const path = require('path');
      return path.join(workdir, 'src', relpath).replace(/\//gmi, path.sep);
    },

    abs2rel: (abspath) => {
      const path = require('path');
      const basedir = path.join(workdir).replace(/\\/gmi, '/');
      return abspath.replace(/\\/gmi, '/').replace(new RegExp(`^${basedir}/[^/]+`), '').replace(/\//gmi, path.sep);
    },

    abssrc: (relpath) => {
      const path = require('path');
      return path.join(workdir, 'src', relpath).replace(/\//gmi, path.sep);
    },

    absdest: (relpath) => {
      const path = require('path');
      return path.join(workdir, 'dist', relpath).replace(/\//gmi, path.sep);
    },

    abstmp: (relpath) => {
      const path = require('path');
      return path.join(workdir, '.tmp', relpath).replace(/\//gmi, path.sep);
    },

    isBrowser,

    isServer: () => {
      return !isBrowser();
    },


    getData,


    setData,

    radom: (m = 0, n = 100000000) => {
      return Math.floor(Math.random() * (n - m + 1)) + m;
    },

    queryString: (url) => {
      const qs = {};
      var matches = url.match(/[^=?&#]+=[^=?&#]+/g);
      if (matches) {
        for (const match of matches) {
          const kv = match.split('=');
          qs[kv[0]] = kv[1];
        }
      }
      return qs;
    },

    sleep: (delay) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, delay);
      });
    },

    range: (start, end) => {
      const arr = [];
      for (let i = start; i <= end; i++) {
        arr.push(i);
      }
      return arr;
    },

    getDateTime: (s) => {
      const exec = (/(\d+)-(\d+)-(\d+)\s+(\d+):(\d+):(\d+)/.exec(s));
      const year = exec[1] - 0;
      const month = exec[2] - 1;
      const date = exec[3] - 0;
      const hh = exec[4] - 0;
      const mi = exec[5] - 0;
      const ss = exec[6] - 0;
      return new Date(year, month, date, hh, mi, ss);
    },

    getFormatDate: (date, format) => {
      const obj = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        'S': date.getMilliseconds()
      };

      if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
      }

      for (const key in obj) {
        if (new RegExp(`(${key})`).test(format)) {
          format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ?
            (obj[key]) : ((`00${obj[key]}`).substr((obj[key] + '').length)));
        }
      }

      return format;
    },
  };
};
