const fs = require('fs');
const sql = require('mssql');

// Use the mssql (tedious) driver configuration for the primary DB
const dbConfigd = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const serverIp = dbConfigd.serverip;
const dbConfig = dbConfigd.mssql;

// Log connection info and do a lightweight health check on startup
(async () => {
    const { server, database } = dbConfig;
    try {
        const pool = await sql.connect(dbConfig);
        console.log(`[DB] Connected to ${database} on ${server}`);
        await pool.close();
    } catch (err) {
        console.error(`[DB] Connection failed to ${database} on ${server}:`, err.message);
    }
})();

module.exports = { dbConfig, serverIp };
