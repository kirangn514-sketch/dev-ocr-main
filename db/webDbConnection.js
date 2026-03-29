const fs = require('fs');
const sql = require('mssql');

// Use the mssql (tedious) driver configuration for the web DB
const dbConfigd = JSON.parse(fs.readFileSync('data_web.json', 'utf8'));
const webDbConfig = dbConfigd.mssql;

(async () => {
    const { server, database } = webDbConfig;
    try {
        const pool = await sql.connect(webDbConfig);
        console.log(`[WEB DB] Connected to ${database} on ${server}`);
        await pool.close();
    } catch (err) {
        console.error(`[WEB DB] Connection failed to ${database} on ${server}:`, err.message);
    }
})();

module.exports = webDbConfig;
