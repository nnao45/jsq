const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './browser-entry.ts',
  output: {
    filename: 'jsq-browser.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'JSQ',
    libraryTarget: 'umd',
    globalObject: 'this',
    publicPath: 'auto'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      // Node.js固有モジュールのスタブ
      'fs': false,
      'path': false,
      'stream': false,
      'child_process': false,
      'os': false,
      'util': false
    },
    fallback: {
      // ブラウザで使用するポリフィル
      "buffer": false,
      "process": false
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index-webpack.html',
      filename: 'index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'style.css', to: 'style.css' }
      ]
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
    hot: true
  },
  // QuickJS WASMのための設定
  experiments: {
    asyncWebAssembly: true
  }
};