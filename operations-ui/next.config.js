/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
      config.externals = [...(config.externals || []), { canvas: 'canvas' }];
      return config;
    },
    // Add Turbopack config to silence the error
    turbopack: {
      resolveAlias: {
        canvas: './empty-module.js',
      },
    },
  };
  
  module.exports = nextConfig;