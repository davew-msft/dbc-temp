const path = require('path');

module.exports = {
  babel: {  
    presets: ['@babel/preset-react'],  
  },
  webpack: {
    configure: (webpackConfig) => {
    const env = process.env.WEBSITE_SITE_NAME || 'local';
    console.log(`Using config file: ./src/config/config.${env}.json`);
    webpackConfig.resolve.alias['config'] = path.resolve(__dirname, `./src/config/config.${env}.json`);
    webpackConfig.resolve.extensions.push('.jsx');
    return webpackConfig;
    },
  },
};