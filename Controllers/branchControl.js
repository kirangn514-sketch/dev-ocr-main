const sql = require('mssql');
const { dbConfig } = require("../db/dbConnection")
const logger = require("../logging/logger")


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
