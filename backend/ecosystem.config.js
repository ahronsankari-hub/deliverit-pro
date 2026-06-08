module.exports = {
  apps: [{
    name: 'deliverit-api',
    script: 'src/server.js',
    instances: 'max',       // מריץ instance אחד לכל CPU core
    exec_mode: 'cluster',   // מאפשר load balancing בין הinstances
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
