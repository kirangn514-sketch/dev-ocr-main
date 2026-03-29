const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const { dbConfig } = require("./dbConnection")
// Database configuration



// const dbConfigd = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// const dbConfig_mssql = dbConfigd.mssqlnode

// let pool =  sql.connect(dbConfig_mssql);
// const dbConfig = {
//     user: 'YOUR_USERNAME',
//     password: 'YOUR_PASSWORD',
//     server: 'YOUR_SERVER_NAME', // e.g. 'localhost\\SQLEXPRESS'
//     database: 'RBLCTSWIN',
//     options: {
//         encrypt: false, // Set to true if using Azure
//         enableArithAbort: true,
//         trustServerCertificate: true // If you're working locally or have self-signed certs
//     }
// };
let pool
async function closeDatabaseConnections() {
    if (pool && pool.connected) {
        try {
            console.log('Closing SQL database connections...');
            await pool.close(); // Close the connection pool
            console.log('Database connections closed.');
        } catch (err) {
            console.error('Error while closing database connections:', err);
        }
    }
}

// Capture termination signals
process.on('SIGINT', async () => {
    await closeDatabaseConnections();
    process.exit(0); // Exit the application
});

process.on('SIGTERM', async () => {
    await closeDatabaseConnections();
    process.exit(0); // Exit the application
});


async function checkDbConnection() {
    let pool = await sql.connect(dbConfig);
    try {
        // Attempt to connect to the database

        console.log('Database connection successful');
        return pool; // return the connection pool if you need it
    } catch (err) {
        console.error('Database connection failed: ', err);
    }
    finally {
        // ✅ Ensure the connection is closed
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }
}

// Call the function to check the connection
//checkDbConnection();
// Function to execute stored procedure
async function executeProcedure(params) {
    const pool = await sql.connect(dbConfig);
    try {
        // Connect to the database


        console.log("Connected with mssql")
        // Execute the stored procedure with input parameters
        let result = await pool.request()
            .input('BranchNationID', sql.Int, params.BranchNationID)
            .input('Batchno', sql.Int, params.Batchno)
            .input('ClearingID', sql.VarChar(2), params.ClearingID)
            .input('ChequeCount', sql.Int, params.ChequeCount)
            .input('TotalAmount', sql.Numeric(18, 2), params.TotalAmount)
            .input('FileName', sql.VarChar(1000), params.FileName)
            .input('UserID', sql.VarChar(6), params.UserID)
            .input('PresentingDate', sql.VarChar(10), params.formatedDate)
            .input('BankID', sql.Int, params.BankID)
            .input('DepositorAC', sql.VarChar(18), params.DepositorAC)
            .input('PayeeName', sql.VarChar(30), params.PayeeName)
            .input('PayeeName_Flag', sql.VarChar(1), params.PayeeName_Flag)
            .input('IFSCCode', sql.VarChar(11), params.IFSCCode)
            .input('presentingMICR', sql.VarChar(9), params.presentingMICR)
            .input('scannerID', sql.VarChar(20), params.scannerID)
            .input('BatchType', sql.VarChar(1), params.BatchType)
            .execute('dbo.SP_INSERT_BATCHDETAILS_MOB');

        // Return the result
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
    finally {
        // ✅ Ensure the connection is closed
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }
}



const batchSchema = Joi.object({
    BranchNationID: Joi.number().integer().required(),
    ClearingID: Joi.string().max(2).required(),
    ChequeCount: Joi.number().integer().required(),
    TotalAmount: Joi.number().precision(2).required(),
    UserID: Joi.string().max(6).required(),
    PresentingDate: Joi.string().length(10).required(), // Date format can be adjusted based on requirement
    BankID: Joi.number().integer().required(),
    IFSCCode: Joi.string().length(11).required(),
    presentingMICR: Joi.string().length(9).required(),
    scannerID: Joi.string().max(20).required(),
    gridId : Joi.string().required()


});


const getCutoffTime = async () => {

    const pool = await sql.connect(dbConfig);
    try {
        let result = await pool.request()
            .execute('SP_getCutoffTime');

        return result.recordset;
    }
    catch (err) {
        console.error('SQL error :getCutoff', err);
        throw err;
    }
    finally {

        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }
}

const checkHoliday = async (formatedDate, gridId) => {
    const pool = await sql.connect(dbConfig);
    try {
        let result = await pool.request()
            .input('CDate', sql.VarChar(10), formatedDate)
            .input('GridID', sql.VarChar(2), gridId.toString())
            .execute('SP_Holiday');

        return result.recordset;
    }
    catch (err) {
        console.error('SQL error :checkHoliday', err);
        throw err;
    }
    finally {

        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }
}


module.exports = { executeProcedure, checkDbConnection, batchSchema, getCutoffTime, checkHoliday };
