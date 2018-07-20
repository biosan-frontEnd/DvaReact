const join = require('path').join
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const pxtorem = require('postcss-pxtorem');
const autoprefixer = require('autoprefixer');
const compressionPlugin = require('compression-webpack-plugin');

const assetsPath = (...relativePath) => join(__dirname, '..', ...relativePath)
const isFontFile = url => /\.(woff2?|eot|ttf|otf)(\?.*)?$/.test(url)
const isProd = process.env.BABEL_ENV === 'production'
const isReport = process.env.REPORT === 'true'
const target = process.env.TARGET ? process.env.TARGET : 'admin'
const postCssPlugins = [
  autoprefixer({
    browsers: ['last 2 versions', 'Firefox ESR', '> 1%', 'ie >= 8', 'iOS >= 8', 'Android >= 4'],
  })
]
target === 'web' && postCssPlugins.push(pxtorem({ rootValue: 75, propWhiteList: [] }))

const getEntry = (target) => {
  let entry = {
    [target]: [assetsPath(`src/${target}-entry`)],
    'polyfill': [assetsPath(`src/_polyfill`)]
  }
  return Object.keys(entry).reduce((entry, key) => ({
    ...entry,
    [key]: isProd ? entry[`${key}`] : entry[`${key}`].concat(['webpack-hot-middleware/client'])
  }), entry)
}

const getOutput = (target) => {
  return Object.assign({}, {
    path: assetsPath(`dist/${target}`),
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
    publicPath: '/'
  }, isProd ? {
    filename: 'js/[name].[chunkhash:7].js',
    chunkFilename: 'js/[name].chunk.[chunkhash:7].js'
  } : {})
}

let webpackConfig = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'cheap-module-source-map',
  entry: getEntry(target),
  output: getOutput(target),
  resolve: {
    extensions: ['.web.js', '.js', '.json', '.web.jsx', '.jsx'],
    modules: [
      assetsPath('src'),
      assetsPath('node_modules')
    ],
    alias: Object.assign({}, {
      '@': assetsPath('src'),
      'assets': assetsPath('src/assets'),
      'components': assetsPath('src/components'),
      'middlewares': assetsPath('src/middlewares'),
      'models': assetsPath('src/models'),
      'routes': assetsPath('src/routes'),
      'themes': assetsPath('src/themes'),
      'utils': assetsPath('src/utils')
    })
  },
  module: {
    rules: [{
      test: /\.(js)$/,
      enforce: 'pre',
      loader: 'eslint-loader',
      include: [assetsPath('src')],
      exclude: [assetsPath('src/assets/libs')],
      options: {
        formatter: require('eslint-friendly-formatter')
      }
    },
    {
      test: /\.js$/,
      include: [assetsPath('src/assets/libs')],
      use: 'imports-loader?this=>window&define=>false'
    },
    {
      test: /\.jsx?$/,
      use: 'babel-loader',
      include: [assetsPath('src')]
    },
    {
      test: /\.(sa|sc|c)ss$/,
      use: [
        isProd ? MiniCssExtractPlugin.loader : 'style-loader',
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            plugins: (loader) => postCssPlugins
          }
        },
        'sass-loader',
      ]
    },
    {
      test: /\.less$/,
      use: [
        isProd ? MiniCssExtractPlugin.loader : 'style-loader',
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            plugins: (loader) => postCssPlugins
          }
        },
        {
          loader: 'less-loader',
          options: {
            modifyVars: { "@primary-color": "#1DA57A" },
          }
        }
      ]
    },
    {
      test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
      loader: 'url-loader',
      query: {
        limit: 10000,
        name: 'img/[name].[hash:7].[ext]',
        publicPath: '../'
      }
    },
    {
      test: /\.(woff2?|eot|ttf|otf|mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
      loader: 'file-loader',
      options: {
        name: '[name].[hash:7].[ext]',
        outputPath: url => `${isFontFile(url) ? 'fonts' : 'media'}/${url}`,
        publicPath: url => `${isFontFile(url) ? '../' : './'}${url}`
      }
    }]
  },
  optimization: {
    runtimeChunk: {
      name: 'manifest'
    },
    minimize: isProd,
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true
      }),
      new OptimizeCSSAssetsPlugin({})
    ],
    splitChunks:{
      chunks: 'async',
      minSize: 30000,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      name: false,
      cacheGroups: {
        vendor: {
          name: 'vendor',
          test: /node_modules\/(.*)\.js/,
          chunks: 'initial',
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: false
        }
      }
    }
  },
  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new webpack.HashedModuleIdsPlugin(),
    new webpack.EnvironmentPlugin({
      NODE_ENV: JSON.stringify(isProd ? 'production' : 'development'),
      DEBUG: !isProd
    }),
    new MiniCssExtractPlugin({
      filename: isProd ? '[name].[hash].css' : '[name].css',
      chunkFilename: isProd ? '[name].[hash].css' : '[name].css'
    }),
    new HtmlWebpackPlugin({
      inject: true,
      minify: isProd ? {
        html5: false,
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : {},
      // chunks: (isProd ? ['manifest'] : ['manifest']).concat([target, 'vendor2']),
      filename: `index.html`,
      template: assetsPath('src/_tpl.html')
    }),
  ].concat(isProd ? [
    new compressionPlugin({
      asset: '[path].gz[query]',
      algorithm: 'gzip',
      test: new RegExp('\\.(js|css)$'),
      threshold: 10240,
      minRatio: 0.8
    })
  ] : [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.HotModuleReplacementPlugin()
  ]),
  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
  }
}

isReport && webpackConfig.plugins.push(new BundleAnalyzerPlugin())
module.exports = webpackConfig
