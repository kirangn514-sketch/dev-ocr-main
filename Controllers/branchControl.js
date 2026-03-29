const sql = require('mssql');
const axios = require('axios');
const FormData = require('form-data');
const { dbConfig } = require("../db/dbConnection")
const logger = require("../logging/logger")
const fs = require('fs');

const dbConfigdStr = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const serverIp_2 = dbConfigdStr.serverIp_2;


exports.getAllBranch = async (req, res) => {

    try {
        const pool = await sql.connect(dbConfig);
        const qury = `Select Distinct BRanchID,BranchName From MPresentingBank order by 2`;
        const result = await pool.request().query(qury);
        await pool.close();

        const row = result.recordset;

        const trimData = () => {
            return row.map((item) => {
                return { BranchID: item.BRanchID, BranchName: item.BranchName.trim() }
            })
        }

        if (row.length === 0) return res.status(200).json({
            res_code: 1,
            status: "Success",
            message: "No Branch Listed"
        })

        else return res.status(200).json(
            {
                res_code: 1,
                status: "success",
                message: "Branch List Fetched successfully",
                branchList: trimData(),


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

// Proxy to local OCR service that reads cheque content
// Accepts multipart/form-data with field name `file` and forwards to
// http://127.0.0.1:8000/read-cheque
exports.readCheque = async (req, res) => {
    const READ_CHEQUE_TIMEOUT_MS = parseInt(process.env.READ_CHEQUE_TIMEOUT_MS, 10) || 120000;

    try {
        if (!req.file) {
            return res.status(400).json({
                res_code: 0,
                status: "error",
                message: "file is required in multipart/form-data"
            });
        }

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'upload.jpg',
            contentType: req.file.mimetype || 'image/jpeg'
        });

        const upstreamResponse = await axios.post(
            `http://${serverIp_2}:8000/read-cheque`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    accept: 'application/json'
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: READ_CHEQUE_TIMEOUT_MS
            }
        );

        return res.status(200).json({
            res_code: 1,
            status: "success",
            message: "Cheque read successfully",
            data: upstreamResponse.data
        });
    } catch (error) {
        logger.error(error);
        const status = error.response?.status || 500;
        console.error(error)
        return res.status(status).json({
            res_code: 0,
            status: "error",
            message: "Failed to read cheque",
            upstreamStatus: status,
            upstreamResponse: error.response?.data || error.message,
            code: error.code === 'ECONNABORTED' ? 'upstream_timeout' : error.code
        });
    }
}

// Fetch branch details (and optional scanners) by bankId + branchId
// Returns shape expected by callers in userControl/encryptionController.
exports.getBrachFromBarnchId = async (req, res) => {
    const { bankId, branchId } = req.body || {};

    if (!branchId) {
        return res.status(400).json({
            res_code: 0,
            status: "error",
            message: "branchId is required"
        });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // Adjust query/joins as needed once schema is known; this keeps behavior non‑breaking.
        const branchResult = await pool.request()
            .input('branchId', sql.Int, branchId)
            .query(`SELECT 
                     mb.BranchID,
                     RTRIM(mb.BranchName) AS BranchName,
                     STRING_AGG(mc.ScannerModelName, ',') AS ScannerModelNames
                    FROM MPresentingBank mb
                    LEFT JOIN MScanner mc 
                    ON mc.BranchName = mb.BranchID
                    WHERE mb.BranchID =  @branchId
                    GROUP BY mb.BranchID, mb.BranchName`)
        // .query(`Select BRanchID, BranchName From MPresentingBank where BRanchID = @branchId`);

        // Placeholder for scanner mapping; returns empty list if none.
        const scannerIds = [];

        await pool.close();
       console.log(":::",  branchResult.recordset)
        const branchDetails = branchResult.recordset?.map(b => ({
            BranchID: b.BRanchID,
            BranchName: (b.BranchName || "").trim(),
            scannerIds : b.ScannerModelNames.split(',')
        })) || [];

        if (branchDetails.length === 0) {
            return res.status(200).json({
                res_code: 1,
                status: "success",
                message: "No branch found for given id",
                branchDetails: [],
                scannerId: scannerIds
            });
        }

        return res.status(200).json({
            res_code: 1,
            status: "success",
            message: "Branch fetched successfully",
            branchDetails,
           // scannerId: [...branchResult?.recordset?.ScannerModelNames]
        });
    } catch (error) {
        logger.error(error);
        console.log(error);
        return res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database connection failed ${error}`
        });
    }
}
