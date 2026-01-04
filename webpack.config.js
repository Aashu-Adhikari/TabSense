const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    mode: argv.mode || 'production',
    // 1. CHECK THIS SECTION CAREFULLY
    entry: {
      popup: './src/popup/index.js',
      background: './src/background/background.js',
      content: './src/content/content.js'
      // ❌ DELETE THIS LINE IF IT EXISTS: scraper: './src/content/scraper.js'
    },
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].js',
      clean: true,
    },
    // Disable source maps in production to save space
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
          { from: "src/ml/pretrained-model", to: "ml/pretrained-model" },
          
          // 2. THIS IS HOW THE SCRAPER GETS TO BUILD FOLDER
          // It copies the file exactly as is, without minification.
          // { from: "src/content/scraper.js", to: "scraper.js" } 
        ]
      })
    ],
  };
};