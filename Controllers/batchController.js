const sql = require('mssql');
const { dbConfig } = require("../db/dbConnection")
const { getData } = require("../Controllers/finalUploadController")
const logger = require("../logging/logger")

exports.getClearingCodes = async (req, res) => {

    try {
        const pool = await sql.connect(dbConfig);
        const query = "select ClearingCode, ClearingType,ClearingDescription from MClearingType";
        const result = await pool.request().query(query);
        await pool.close();

        const row = result.recordset;

        if (row.length === 0) return res.status(200).json({
            res_code: 1,
            status: "Success",
            message: "No Clearing Code Listed"
        })


        else {

            return res.status(200).json({
                res_code: 1,
                status: "success",
                message: "Clearing Code Fetched Successfully",
                data: row
            })
        }

    }
    catch (error) {
        console.log(error)
        logger.error(error)
        return res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database error ${error}`
        })
    }
}

exports.batchCreation = async (req, res) => {

    const {

        branchID,
        clearingId,
        chequeCount,
        totalAmount,
        userId,
        presentingDate,
        bankId,
        ifscCode,
        micrCode,
        scannerId
    } = req.body

    const query_direct = `SP_INSERT_BATCHDETAILS_MOB  '13','111','01','4','110','demo','001', '03/09/2024' ,'3','test1','test2', 't','RATN0000050','411176003', '70002','R'`

    // Format presentingDate to match 'dd/MM/yyyy' required by SQL Server
    const formattedPresentingDate = formatPresentingDate(presentingDate);

    // Parameters for the stored procedure (currently unused because query_direct is hard-coded)
    const params_03 = [
        branchID,
        clearingId,
        chequeCount,
        totalAmount,
        userId,
        formattedPresentingDate,
        bankId,
        ifscCode,
        micrCode,
        scannerId
    ];

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(query_direct);
        await pool.close();

        const insertedData = result.recordset && result.recordset.length ? result.recordset[0] : null;

        console.log("Inserted Data :-- ", insertedData)
        logger.info("Batch Creation Successful")
        return res.status(200).json({
            res_code: 1,
            status: "success",
            message: "Batch Creation Successful",
            data: insertedData
        });
    } catch (error) {
        console.error('Error during batch creation:', error);
        logger.error(error)
        return res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Error during batch creation: ${error.message}`
        });
    }
};

// Helper function to format the presenting date to 'dd/MM/yyyy'
function formatPresentingDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function checkCurrentCutoff(cutoffTime) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const cutoffDateTime = new Date(`${today}T${cutoffTime}:00`);

    if (now > cutoffDateTime) {
        return "Cut off time is passed";
    } else {
        return "Within cut off time";
    }
}


function checkCutoff(inputDate, cutoffTime) {
    const now = new Date();
    let response = {
        status: null,
        responseMsg: ""
    }

    const [year, month, day] = inputDate.split("-").map(Number);
    const input = new Date(year, month - 1, day);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (input > today) {
        response.status = true
        response.responseMsg = "Within cut off time"
        return response;
    }

    if (input < today) {
        response.status = false
        response.responseMsg = "Cut off time is passed"
        return response;
    }

    const [cutHour, cutMinute] = cutoffTime.split(":").map(Number);
    const cutoffDateTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        cutHour,
        cutMinute
    );

    if (now > cutoffDateTime) {
        response.status = false
        response.responseMsg = "Cut off time is passed"
        return response;
    } else {
        response.status = true
        response.responseMsg = "Within cut off time"
        return response;
    }
}

function checkCutoffWithTime(inputDate, inputTime, cutoffTime) {
    const [y, m, d] = inputDate.split("-").map(Number);
    const [h, min] = inputTime.split(":").map(Number);

    const inputDateTime = new Date(y, m - 1, d, h, min);
    const cutoffDateTime = new Date(y, m - 1, d, ...cutoffTime.split(":").map(Number));

    if (inputDateTime > cutoffDateTime) {
        return "Cut off time is passed";
    }

    return "Within cut off time";
}





const { executeProcedure, batchSchema, getCutoffTime, checkHoliday } = require("../db/batchCreation")



exports.batchCreationwithmssql = async (req, res) => {
    let err = false;

    const { error, value } = batchSchema.validate(req.body);

    const getCutoff = await getCutoffTime()

    console.log("Cuttofftime--", getCutoff[0].CutoffTimeOW)
    const cutOff = checkCurrentCutoff(getCutoff[0].CutoffTimeOW)


    if (error) {
        logger.error(error)
        return res.status(400).json({
            res_code: 0,
            error: error.details[0].message,
            msg: "batchCreationwithmssql"
        });
    }

    const { BranchNationID, ClearingID, ChequeCount, TotalAmount, UserID, PresentingDate, BankID, IFSCCode, presentingMICR, scannerID, is_DepositeSlip, is_SubBankMember, gridId } = value;
    const Batchno = 0;
    const FileName = "M"
    const DepositorAC = null
    const PayeeName = null
    const PayeeName_Flag = "N"
    const BatchType = "R"
    const formatedDate = formatPresentingDate(PresentingDate)

    const params = {
        BranchNationID,
        Batchno,
        ClearingID,
        ChequeCount,
        TotalAmount,
        FileName,
        UserID,
        formatedDate,
        BankID,
        DepositorAC,
        PayeeName,
        PayeeName_Flag,
        IFSCCode,
        presentingMICR,
        scannerID,
        BatchType,
        is_DepositeSlip,
        is_SubBankMember
    };

    const checkCutOff_2 = checkCutoff(PresentingDate, cutOff)
    console.log("Data From ___v2:", checkCutOff_2)
    const isHoliday = await checkHoliday(formatedDate, gridId)
    console.log("hoiday", isHoliday[0]?.reason)

    try {

        if (!isHoliday[0]?.reason == 0) {

            return res.status(200).json({
                res_code: 2,
                message: ` ${isHoliday[0]?.reason} : please select another date`,

            })
        }

        if (checkCutOff_2?.status) {
            const result = await executeProcedure(params);
            console.log("New Batch creation with MS SQL :", result)
            await getData(result)
            return res.status(200).json({
                res_code: 1,
                message: "Batch Created Successfully",
                data: result
            })
        }
        else {
            return res.status(200).json({
                res_code: 2,
                data: checkCutOff_2?.responseMsg
            })
        }

    } catch (err) {
        logger.error(err)
        res.status(500).json({
            res_code: 0,
            error: err.message,
            msg: "batchCreationwithmssql-2", err
        });
    }
}


exports.getAllScanDetailsWithBatchid = async (req, res) => {
    let pool = await sql.connect(dbConfig);
    try {
        const { batchId } = req.body; // Extract batchId from request body
        if (!batchId) {
            return res.status(400).json({
                res_code: 0,
                status: "error",
                error: "BatchID is required"
            });
        }


        const detailscanResult = await pool.request()
            .input('BatchhID', sql.BigInt, parseInt(batchId))
            .execute("GetOutwardBatchScanDetails_mob");
        const result = await pool.request()
            .input('BatchID', sql.BigInt, batchId)
            .execute("GetOutwardBatchDetails_mob");

        const data = result.recordset;
        const scanDetails = detailscanResult.recordset;

        console.log("Detailed Data:", scanDetails);

        return res.status(200).json({
            batchData: data,
            scanDetails: scanDetails
        });
    } catch (error) {
        logger.error(error);
        console.error("DB Error:", error);
        return res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database error: ${error.message}`
        });
    } finally {

        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }
};
