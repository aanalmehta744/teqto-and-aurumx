const mysql = require('mysql2');
require('dotenv').config(); // Load environment variables

// MySQL Database Connection Pool with Promises
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10, // Ensure it's a number
});

// Create a promise-based pool
const promisePool = pool.promise();

// Test connection and log status
promisePool.getConnection()
    .then((connection) => {
        console.log('✅ Connected to MySQL database');
        connection.release();  // Release connection back to pool
    })
    .catch((err) => {
        console.error('❌ Database connection failed:', err.stack);
        process.exit(1); // Exit the process if unable to connect
    });

module.exports = promisePool;
