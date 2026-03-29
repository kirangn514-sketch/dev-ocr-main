const path = require('path');

module.exports = {
  mode: 'production', // or 'development'
  target: 'node',
  entry: './index.js', // your main Node.js entry file
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  externals: {
    'msnodesqlv8': 'commonjs msnodesqlv8', '@azure/app-configuration': 'commonjs @azure/app-configuration',
    '@azure/keyvault-secrets': 'commonjs @azure/keyvault-secrets',
    'oci-common': 'commonjs oci-common',
    'oci-objectstorage': 'commonjs oci-objectstorage',
    'oci-secrets': 'commonjs oci-secrets',
    sharp: 'commonjs sharp'
  },

  module: {
    rules: [
      {
        test: /express[\\\/]lib[\\\/]view\.js/,
        loader: 'string-replace-loader',
        options: {
          search: 'require(resolve(dir, file));',
          replace: 'require(file);',
        },
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json', '.node'], // Resolve .node files

    alias: {
      'thin/sqlnet/paramParser.js': path.resolve(__dirname, 'node_modules/oracledb/lib/thin/sqlnet/paramParser.js'),
    },

  }
};


