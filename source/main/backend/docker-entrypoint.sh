#!/bin/sh

set -e

echo "Waiting for MySQL..."

until node -e "
const mysql = require('mysql2/promise');

mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
}).then(async connection => {
  await connection.end();
  process.exit(0);
}).catch(() => process.exit(1));
"; do
  echo "MySQL is not ready yet..."
  sleep 2
done

echo "MySQL is ready."

echo "Initializing database..."
node create_db.js

echo "Starting backend..."
exec npm start
