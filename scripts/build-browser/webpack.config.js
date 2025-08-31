const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, './browser-entry.ts'),
  output: {
    filename: 'jsq-browser.js',
    chunkFilename: '[id].jsq-browser.js',
    path: path.resolve(__dirname, '../../docs-site/public'),
    library: 'JSQ',
    libraryTarget: 'umd',
    globalObject: 'this',
    publicPath: './',
    clean: {
      keep: (asset) => !asset.includes('jsq-browser') && !asset.endsWith('.wasm')
    }
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
            configFile: path.resolve(__dirname, '../../tsconfig.json')
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
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: 10
        }
      }
    }
  },
  // QuickJS WASMのための設定
  experiments: {
    asyncWebAssembly: true
  },
  performance: {
    hints: false // WASMファイルサイズ警告を無効化
  }
};