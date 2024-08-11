import { Config } from './config.interface';

/**
 * @function loadConfig
 * loads the configuration from the environment variables.
 *
 * @returns Config
 */
export const loadConfig = (): Config => ({
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'secret',
  client: {
    host: process.env.CLIENT_HOST || 'localhost',
    port: parseInt(process.env.CLIENT_PORT || '5173', 10),
    url: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  server: {
    host: process.env.SERVER_HOST || 'localhost',
    port: parseInt(process.env.SERVER_PORT || '3000', 10),
    url: process.env.SERVER_URL || 'http://localhost:3000',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'chat-app',
    password: process.env.DB_PASSWORD || 'chat-app',
    database: process.env.DB_NAME || 'chat-app',
  },
});
