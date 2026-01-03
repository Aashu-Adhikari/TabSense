// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    mode: argv.mode || 'production',
    entry: {
      popup: './src/popup/index.js',
      background: './src/background/background.js',
      content: './src/content/content.js' 
      // REMOVED: scraper entry. We don't want to bundle it.
    },
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].js',
      clean: true,
    },
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
          // ADD THIS LINE: Copy the scraper raw to the build root
          { from: "src/content/scraper.js", to: "scraper.js" } 
        ]
      })
    ],
  };
};