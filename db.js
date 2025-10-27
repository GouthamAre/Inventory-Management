const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',             // 👈 your MySQL username
  password: '1307', // 👈 your actual password
  database: 'inventory_database'
});

module.exports = db;
