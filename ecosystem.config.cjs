/**
 * PM2 config for production (VPS).
 * From repo root: `pm2 start ecosystem.config.cjs && pm2 save`
 * Paths use __dirname so it works regardless of clone location (e.g. /var/www/gemini-prompts).
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'gp-api',
      cwd: path.join(__dirname, 'apps/api'),
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'gp-web',
      cwd: path.join(__dirname, 'apps/web'),
      script: 'npm',
      args: 'run start',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 30001,
      },
    },
  ],
};
