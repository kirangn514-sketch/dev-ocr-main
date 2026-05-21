const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');

// Database configuration



const dbConfigd = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const dbConfig_mssql = dbConfigd.mssqlnode




async function executeProcedure(params) {


    console.log("param data------▐☻☻", params)
    let pool = await sql.connect(dbConfig_mssql);
    try {


        let result = await pool.request()
            .input('BatchID', sql.BigInt, params?.batchId)
            .input('BranchNationID', sql.Int, params?.branchnationId)
            .input('ChequeNumber', sql.VarChar, params?.cheque_chequeNo)
            .input('ChequeAccountNumber', sql.VarChar, params?.cheque_rbiAccNo)
            .input('TransactionCode', sql.VarChar, params?.cheque_trCode)
            .input('Amount', sql.Decimal, params?.cheque_amt)
            .input('UserID', sql.VarChar, params?.userId)
            .input('BackTiff', sql.VarChar, params?.backTiff)
            .input('frontTiff', sql.VarChar, params?.frontTiff)
            .input('FrontJpg', sql.VarChar, params?.frontJpeg)
            .input('TransactionSlipID', params?.transactionSlipID)
            .input('BranchCode', sql.VarChar, params?.cheque_micr)
            .input('status', sql.Int, params?.statusCode)
            .input('ImagePath', sql.VarChar, params?.imagePath)
            .input('ISP2F', sql.Bit, params?.isp2f)
            .input('ChequeID', sql.Int, params?.chequeId)
            .input('EndNo', sql.VarChar, params?.endNo)
            .input('PresentingDate', sql.DateTime, params?.date)
            .input('FrontUV', sql.VarChar, params?.frontUV)
            .input('IQA', sql.VarChar, params?.iqa)
            .input('ScannerID', sql.VarChar, params?.scannerId)
            .input('ServerImagePath', sql.VarChar, params?.serverImagePath)
            .input('SliPRefNo', sql.Int, params?.slipno)
            .execute('Proc_InsertBranchBatchScanDetailSlip_mob');

        return result.recordset;
    } catch (error) {
        console.error('Error executing stored procedure:', error);
        throw error;
    } finally {
        // ✅ Ensure the connection is closed
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }
};


const uploadImageSchema = Joi.object({
    // batchId: Joi.number().integer().required(),
    branchnationId: Joi.number().integer().required(),
    cheque_chequeNo: Joi.string().max(9).required(),
    cheque_rbiAccNo: Joi.string().max(8).required(),
    cheque_trCode: Joi.string().max(5).required(),
    cheque_amt: Joi.number(),
    userId: Joi.string(),
    cheque_micr: Joi.string().required(),
    date: Joi.string().length(10).required(), // Date format can be adjusted based on requirement
    scannerId: Joi.string().required(),
    endNo: Joi.string().required()

});



async function chequeRescanValidation(chequeNumber, params) {

    let pool = await sql.connect(dbConfig_mssql);
    try {

        const checkQuery = `SELECT * FROM OutwardBatchScandetails WHERE ChequeNumber = @ChequeNumber and BranchCode = @BranchCode and ChequeAccountNumber = @ChequeAccountNumber and Transaction_Code = @TransactionCode`;
        const result = await pool
            .request()
            .input('ChequeNumber', sql.VarChar, chequeNumber) // Use input() to sanitize the query
            .input('BranchCode', sql.VarChar, params?.cheque_micr)
            .query(checkQuery);

        if (result.recordset.length > 0) {
            // If cheque number exists, return an error response
            console.log('Cheque number already exists.');
            return { res_code: 0, success: false, message: 'Cheque number already exists' };
        }
        if (params && Object.keys(params).length > 0) {
            // If cheque number doesn't exist, call the executeProcedure function with the provided parameters
            const executionResult = await executeProcedure(params);
            return { res_code: 1, success: true, message: 'Cheque scan details inserted successfully', data: executionResult };
        }

    } catch (error) {
        console.log(error)
    } finally {
        // ✅ Ensure the connection is closed
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }

}


async function chequeRescanValidation_folder(chequeNumber, branchMicrCode, rbiAccNo, trCode) {
    let pool = await sql.connect(dbConfig_mssql);
    try {
        // Connect to the database


        // Query to check if cheque number exists
        const checkQuery = `SELECT * FROM OutwardBatchScandetails WHERE ChequeNumber = @ChequeNumber and BranchCode = @BranchCode and ChequeAccountNumber = @ChequeAccountNumber and Transaction_Code = @TransactionCode`;

        // Execute the query with sanitized input
        const result = await pool
            .request()
            .input('ChequeNumber', sql.VarChar, chequeNumber)
            .input('BranchCode', sql.VarChar, branchMicrCode) // Replace 'YOUR_MICR_CODE' with the actual MICR code
            .input('ChequeAccountNumber', sql.VarChar, rbiAccNo)
            .input('TransactionCode', sql.VarChar, trCode) // Replace 'YOUR_TR_CODE' with the actual transaction code
            .query(checkQuery);

        // Check if any record is found

        console.log("chequeRescanValidation_folder function output :", result.recordset.length)
        if (result.recordset.length > 0) {
            console.log('Cheque number already exists.');
            return { res_code: 0, success: false, message: 'Cheque number already exists' };
        } else {
            return { res_code: 1, success: true, message: 'Cheque number does not exist' };
        }
    } catch (error) {
        // Log and return error in case of failure
        console.error('Error during cheque validation: ', error);
        return { res_code: 0, success: false, message: 'Error during cheque validation', error };
    } finally {
        // ✅ Ensure the connection is closed
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }


    // finally {
    //     // Close the database connection (optional, depends on your connection pooling strategy)
    //     sql.close();  // Ensure the connection is closed to avoid leaks
    // }
}


const getfolderPath = async () => {
    let pool = await sql.connect(dbConfig_mssql);
    try {

        let sqlQuery = `select * from MPath where PATHGROUP = 'MOBILE'`
        let result = await pool.request().query(sqlQuery);
        console.log(result?.recordset[0])
        // Handle different casing for the LOCATION column and trim whitespace
        const row = result?.recordset[0] || {};
        const loc = row?.LOCATION ?? row.Location ?? row.location;
        return loc?.toString().trim();
    } catch (error) {
        console.log(error)
    } finally {
        // ✅ Ensure the connection is closed
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }


}


const getServerfolderPath = async () => {
    let pool = await sql.connect(dbConfig_mssql);
    try {

        let sqlQuery = `select * from MPath where PATHGROUP = 'MOBILE_Img'`
        let result = await pool.request().query(sqlQuery);
        console.log(result.recordset[0])
        const row = result.recordset[0] || {};
        const loc = row.LOCATION ?? row.Location ?? row.location;
        return loc?.toString().trim();
    } catch (error) {
        console.log(error)
    } finally {
        // ✅ Ensure the connection is closed
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }


}



module.exports = { executeProcedure, uploadImageSchema, chequeRescanValidation, chequeRescanValidation_folder, getfolderPath , getServerfolderPath}