// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin'); // <--- 1. NEW IMPORT

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    mode: argv.mode || 'production',
    entry: {
      popup: './src/popup/index.js',
      background: './src/background/background.js',
      content: './src/content/content.js' 
    },
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].js',
      clean: true,
    },
    devtool: isDevelopment ? 'cheap-module-source-map' : false,

    // 2. NEW OPTIMIZATION BLOCK
    optimization: {
      minimize: !isDevelopment, // Only minimize in production (npm run build)
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              // Removes these specific function calls from the code
              // We keep console.error and console.warn for debugging critical bugs
              pure_funcs: ['console.log', 'console.info', 'console.debug']
            },
            format: {
              comments: false, // Removes comments from the output
            },
          },
          extractComments: false, // Prevents creating a separate LICENSE.txt file
        }),
      ],
    },

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx']
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
        inject: 'body'
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "src/manifest.json", to: "manifest.json" },
          { from: "src/ml/pretrained-model", to: "ml/pretrained-model" },
          { from: "public/icons", to: "icons", noErrorOnMissing: true } 
        ]
      })
    ],
  };
};