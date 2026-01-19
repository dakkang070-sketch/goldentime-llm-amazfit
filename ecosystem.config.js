/**
 * PM2 프로세스 관리 설정
 * 프로덕션 환경에서 사용: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [{
    name: 'goldentime-backend',
    script: './backend/server.js',
    instances: process.env.INSTANCES || 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'backups'],
    instance_var: 'INSTANCE_ID'
  }]
};
