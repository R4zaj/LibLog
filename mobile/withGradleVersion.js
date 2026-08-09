const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGradleVersion = (config, version) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const wrapperPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );
      
      if (fs.existsSync(wrapperPath)) {
        let contents = fs.readFileSync(wrapperPath, 'utf8');
        // Replace the distributionUrl
        contents = contents.replace(
          /distributionUrl=.*/,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${version}-all.zip`
        );
        fs.writeFileSync(wrapperPath, contents, 'utf8');
      }
      
      return config;
    },
  ]);
};

module.exports = withGradleVersion;
