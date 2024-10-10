const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, 'src');
const DEST_DIR = path.resolve(__dirname, 'target');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    'content_scripts/translate': path.resolve(SRC_DIR, 'content_scripts', 'translate.js'),
    'popup/translate': path.resolve(SRC_DIR, 'popup', 'translate.js'),
    'options/options': path.resolve(SRC_DIR, 'options', 'options.js')
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'target')
  },
  module: {
    rules: [
      {
        test: /\.(?:js|mjs|cjs|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              ['@babel/preset-react', { targets: 'defaults' }]
            ],
            plugins: [
              '@babel/plugin-syntax-jsx'
            ]
          }
        }
      },
      {
        test: /\.css/i,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader" },
          { loader: "postcss-loader" }
        ]
      }
    ]
  }
};
