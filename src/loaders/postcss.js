const fs = require('fs');
const handleWebpack = require('./webpack');

module.exports = function(workdir, config) {
  const webpack = handleWebpack(workdir, config);
  return function({ filepath }) {
    return new Promise(async function(resolve, reject) {
      if (!fs.existsSync(filepath)) {
        return reject('file not exists');
      }

      const { extract } = await webpack({
        filepath,
        extract: {
          ext: 'css'
        }
      });

      resolve(extract);
    });
  };
};
