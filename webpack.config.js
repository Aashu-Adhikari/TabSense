const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => { // ← CHANGE 1: Export a function
  const isDevelopment = argv.mode === 'development'; // ← CHANGE 2: Detect mode
  
  return { // ← Return the config object
    mode: argv.mode || 'production', // ← Use the mode from CLI args
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
    // ← CHANGE 3: Add safe devtool setting
    devtool: isDevelopment ? 'cheap-module-source-map' : false,
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
        ]
      })
    ],
    // ← CHANGE 4: Remove devServer block for Chrome extension development
  };
};