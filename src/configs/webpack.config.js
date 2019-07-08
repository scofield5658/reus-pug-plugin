const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = function(config) {
  return {
    module: {
      loaders: [
        {
          test: /\.js$/i,
          loader: 'babel-loader',
          exclude: /node_modules/,
          options: {
            presets: ['env']
          }
        },
        {
          test: /\.vue$/i,
          exclude: /node_modules/i,
          loader: 'vue-loader',
          options: {
            extractCSS: (process.env.REUS_PROJECT_ENV && process.env.REUS_PROJECT_ENV !== 'dev')
          }
        },
        {
          test: /\.pcss$/i,
          loader: ExtractTextPlugin.extract('css-loader!postcss-loader')
        },
        {
          test: config.assets,
          loader: 'url-loader'
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: `"${process.env.REUS_PROJECT_ENV}"`,
          TEST_ENV: `"${config.test}"`,
          BASE_URL: `"${config.baseUrl}"`,
          CDN_URL: `"${config.cdnUrl}"`,
          TARGET: '"client"'
        }
      }),
      //new ExtractTextPlugin("styles.css"),
      /*
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      })
      */
    ],
    devtool: 'inline-source-map'
  };
};
