module.exports = {
  apps: [{
    name: 'primemedia',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 6060,
      BASE_URL: 'https://primemedia.site'
    },
    max_memory_restart: '300M',
    restart_delay: 5000
  }]
};
