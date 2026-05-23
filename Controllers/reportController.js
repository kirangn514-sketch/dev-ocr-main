const sql = require('mssql');
const { dbConfig, serverIp } = require("../db/dbConnection")
const webDbConfig = require("../db/webDbConnection");
const axios = require("axios");
const logger = require("../logging/logger")

// NPCI response status report (structure only - fill query as needed)
exports.getNPCIStatusReport = async (req, res) => {
    const { date, scannerId } = req.body; // add/remove params as per final query

    try {
        if (!date) {
            return res.status(400).json({
                res_code: 0,
                status: "error",
                message: "date required"
            });
        }

        const npciQuery = `
                -- example:
                -- SELECT ChequeNumber, BatchNo, Status, ResponseCode, ResponseMessage, PresentationDate
                -- FROM <YourNPCITable>
                -- WHERE PresentationDate = @date AND (ScannerID = @scannerId OR @scannerId IS NULL)
            `;

        const pool = await sql.connect(dbConfig);
        const request = pool.request()
            .input('date', sql.VarChar, date)
            .input('scannerId', sql.VarChar, scannerId || null);

        const result = await request.query(npciQuery);
        await pool.close();

        const data = (result.recordset || []).map(item => ({
            ChequeNumber: item?.ChequeNumber,
            BatchNo: item?.BatchNo,
            Status: item?.Status,
            ResponseCode: item?.ResponseCode,
            ResponseMessage: item?.ResponseMessage,
            PresentationDate: item?.PresentationDate
        }));

        if (data.length === 0) {
            return res.status(200).json({
                res_code: 1,
                status: "success",
                message: "No NPCI response found for selected details"
            });
        }

        return res.status(200).json({
            res_code: 1,
            status: "success",
            message: "NPCI responses fetched successfully",
            data
        });
    } catch (error) {
        logger.error(error);
        return res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Unexpected error ${error}`
        });
    }
};


exports.getRepot = async (req, res) => {

    const { date, scannerId } = req.body


    try {
        if (!date || !scannerId) {
            logger.error("date and scannerId are required")
            return res.status(400).json({
                res_code: 0,
                status: "error",
                message: "date and scannerId are required"
            })
        }

        const pool = await sql.connect(dbConfig);
        const qury = `select batchNo, ChequeCount, TotalAmount,BatchStatusID, payeename,BatchID,BatchHoldBy from OutwardBatch where PresentationDate = @date and ScannerID = @scannerId`;
        const result = await pool.request()
            .input('date', sql.VarChar, date)
            .input('scannerId', sql.VarChar, scannerId)
            .query(qury);

        const row = result.recordset;

        const getUserName = async (id) => {
            if (id === 0) return "Not Hold";
            const userResult = await pool.request()
                .input('id', sql.Int, id)
                .query(`select UserName from Muser where UserID = @id`);
            return userResult.recordset[0]?.UserName || "Unknown";
        };

        const dataWithHoldBy = await Promise.all(
            row.map(async (item) => ({
                BatchNo: item?.batchNo,
                ChequeCount: item?.ChequeCount,
                TotalAmount: item?.TotalAmount,
                BatchStatusID: item?.BatchStatusID,
                PayeeName: item?.payeename ? item?.payeename.trim() : "",
                BatchID: item?.BatchID,
                BatchHoldBy: await getUserName(item?.BatchHoldBy),
            }))
        );

        await pool.close();

        if (row.length === 0) return res.status(200).json({
            res_code: 1,
            status: "success",
            message: "No record found for selected details"
        })

        else return res.status(200).json(
            {
                res_code: 1,
                status: "success",
                message: "Records Fetched successfully",
                data: dataWithHoldBy,


            })

    } catch (error) {
        logger.error(error)
        res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database connection failed ${error}`,
        })
        console.log(error)
        logger.error(error)
    }



}


exports.getDetailRepot = async (req, res) => {

    const { date } = req.body


    try {
        if (!date) {
            return res.status(400).json({
                res_code: 0,
                status: "error",
                message: "date  required"
            })
        }

        const pool = await sql.connect(dbConfig);
        const qury = `Select BatchhID as BatchNo, ChequeNumber, BranchCode, ChequeAccountNumber, Transaction_Code, Amount,Status, ENDNO,PresentationDate  from OutwardBatchScandetails Where PresentationDate = @date`;
        const result = await pool.request()
            .input('date', sql.VarChar, date)
            .query(qury);

        const row = result.recordset;

        const splitDate = (dt) => {
            try { return dt.toISOString().slice(0, 10); } catch { return dt; }
        }

        const dataWithHoldBy = await Promise.all(
            row.map(async (item) => ({
                BatchNo: item?.BatchNo,
                ChequeNumber: item?.ChequeNumber,
                BranchCode: item?.BranchCode,
                ChequeAccountNumber: item?.ChequeAccountNumber,
                Transaction_Code: item?.Transaction_Code,
                Amount: item?.Amount,
                Status: item?.Status,
                EndEnu: item?.ENDNO,
                PresentationDate: splitDate(item?.PresentationDate)
            }))
        );

        await pool.close();

        if (row.length === 0) return res.status(200).json({
            res_code: 0,
            status: "success",
            message: "No record found for selected details"
        })

        else return res.status(200).json(
            {
                res_code: 1,
                status: "success",
                message: "Records Fetched successfully",
                data: dataWithHoldBy,


            })

    } catch (error) {
        logger.error(error)
        res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database connection failed ${error}`,
        })
        console.log(error)
        logger.error(error)
    }



}




exports.getRejectionReport = async (req, res) => {

    const { presentingMICR, scannerID, presentaionDate } = req.body


    try {

        const resultReport = await axios.post(`http://${serverIp}:5003/cts/getRejectionReport`, { presentingMICR, scannerID, presentaionDate })
        console.log(resultReport)

        const rejData = resultReport.data.rejData

        const formatedData = rejData.map((key) => {
            return {
                BatchNo: key.BatchNo,
                ScannerId: key.ScannerID,
                ChequeNumber: key.ChequeAccountNumber,
                Amount: key.Amount,
                Endorsment_No: key.EndorsmentNo,
                ResponseRejection: key.Reason,
                ResponseRejectionDate: key.ResponceRejectionDate

            }
        })

        res.status(200).json({
            res_code: 1,
            status: "success",
            message: resultReport.data.mesage,
            data: formatedData
        })




    } catch (error) {
        logger.error(error)
        res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database connection failed ${error}`,
        })
        console.log(error)
    }
}


exports.getRetRejectionReport = async (req, res) => {
    const { presentingMICR, scannerID, presentaionDate } = req.body

    console.log(req.body)
    try {
        let pool = await sql.connect(webDbConfig);
        const result = await pool.request()
            .input('presentingMICR', sql.VarChar(20), presentingMICR)
            .input('scannerID', sql.VarChar(20), scannerID)
            .input('presentaionDate', sql.VarChar(20), presentaionDate)
            .execute("SP_GetRejectionStatus_mob");
        await pool.close();

        const data = result.recordset || [];
        const allKeys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
        console.log(allKeys.length);

        if (allKeys.length > 1) {
            if (data.length !== 0 && !data[0]['']) {
                logger.info("Rejection Record Fetch Successfully")
                return res.status(200).json({
                    mesage: "Record Fetch Successfully",
                    rejData: data,
                });
            }
        }

        if (allKeys.length === 0 && data.length === 0) {
            return res.status(200).json({
                mesage: "No Record Found",
                rejData: data,
            });
        }

        if (allKeys.length === 1 && data[0] && (data[0][''] === 6 || data[0][''] === 3)) {
            return res.status(200).json({
                mesage: "Branch MICR or Scanner ID Doesnot map",
                rejData: [],
            });
        }

        return res.status(200).json({
            mesage: "Record Fetch Successfully",
            rejData: data,
        });
    } catch (error) {
        console.log("db error : ", error)
        logger.error("Error while fetching rejection data: ", error)
        return res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database error ${error}`
        })
    }
}


exports.getRejData = async (req, res) => {

    const { presentingMICR, scannerID, presentaionDate } = req.body
    console.log("reqBody ::", req.body )

    try {
        if ( !presentaionDate) {
            return res.status(400).json({
                res_code: 0,
                status: "error",
                message: "presentaionDate is required"
            });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('presentingMICR', sql.VarChar, presentingMICR)
            .input('scannerID', sql.VarChar, scannerID)
            .input('presentaionDate', sql.Date, presentaionDate)
            .query('exec sp_GetRejectionDetails_South_mob  @presentaionDate=@presentaionDate')
           // .query("exec SP_GetRejectionStatus_mob @presentingMICR=@presentingMICR, @scannerID=@scannerID, @presentaionDate=@presentaionDate");
        await pool.close();

        const rows = result.recordset;
        console.log("getRejData", result.recordset)

        if (!rows || rows.length === 0) {
            return res.status(200).json({
                mesage: "No Record Found",
                rejData: []
            });
        }

        const firstRowKeys = Object.keys(rows[0] || {});
        const hasEmptyKey = firstRowKeys.length === 1 && rows[0].hasOwnProperty("");

        if (hasEmptyKey && (rows[0][""] === 6 || rows[0][""] === 3)) {
            return res.status(200).json({
                mesage: "Branch MICR or Scanner ID Doesnot map",
                rejData: []
            });
        }

        logger.info("Rejection Record Fetch Successfully");
        return res.status(200).json({
            mesage: "Record Fetch Successfully",
            rejData: rows
        });
    } catch (error) {
        console.log("db error : ", error);
        logger.error("Error while fetching rejection data: ", error);
        return res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database error ${error}`
        });
    }
}
