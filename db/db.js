const pg = require('pg');
require('dotenv').config();

exports.pool = new pg.Pool ({
  host: process.env.ENV_HOST,
  databese: process.env.ENV_DB,
  user: process.env.ENV_USER,
  port: process.env.ENV_PORT,
  password: process.env.ENV_PASSWORD,
  connectionString: process.env.ENV_DATABASE_URL
});
