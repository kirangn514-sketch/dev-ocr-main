//const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { default: axios } = require('axios');
//const sql = require('msnodesqlv8');


const configd = JSON.parse(fs.readFileSync('data_web.json', 'utf8'));



const webDbConfig = configd.mssqlnode


const printDb = async()=>
{
    let pool = await sql.connect(webDbConfig);
    console.log("RBLCTSWEB :", pool)
}

const uploadOutwardBatchToWeb = async (req,res) => {

    const {batchId, batchNo, scannerId, date} = req.body

    //scanData.batchId
    let pool = await sql.connect(webDbConfig);
   

    //insertOutwardBatch_2()
    // console.log("*♠♠♠♠♠♠    :",outwardBatchData)

    //////////////////////////////////////////////////////////////
 

    try {
          
  
        console.log("Web pool:", pool)
        //console.log("Web pool:", webDbConfig)

        const resultScanData = await axios.post("http://192.168.100.183:5002/cts/getAllScanDetailsWithBatchid" , {batchId})
        const batchData = resultScanData
        console.log(batchData)


        // Step 2: Define Table-Valued Parameters
        // Define the OutwardBatchDataTable TVP
        const tvpOutwardBatch = new sql.Table('OutwardBatchType');

        tvpOutwardBatch.columns.add('BatchID', sql.BigInt); // Changed to BigInt
        tvpOutwardBatch.columns.add('BranchescNationD', sql.BigInt); // Changed to BigInt
        tvpOutwardBatch.columns.add('BankID', sql.Int); // No change
        tvpOutwardBatch.columns.add('batchNo', sql.BigInt); // Changed to BigInt
        tvpOutwardBatch.columns.add('ClearingID', sql.TinyInt); // No change
        tvpOutwardBatch.columns.add('ChequeCount', sql.Int); // No change
        tvpOutwardBatch.columns.add('TotalAmount', sql.Decimal(18, 2)); // Matched the SQL data type
        tvpOutwardBatch.columns.add('DataFileName', sql.NVarChar(250)); // No change
        tvpOutwardBatch.columns.add('BatchStatusID', sql.TinyInt); // No change
        tvpOutwardBatch.columns.add('PresentationDate', sql.DateTime); // Changed to DateTime
        tvpOutwardBatch.columns.add('ProcessingBatchNo', sql.Int); // No change
        tvpOutwardBatch.columns.add('DigitalSignatureID', sql.TinyInt); // No change
        tvpOutwardBatch.columns.add('CreatedBy', sql.NVarChar(6)); // No change
        tvpOutwardBatch.columns.add('CreatedTime', sql.DateTime); // Changed to DateTime
        tvpOutwardBatch.columns.add('ModifiedBy', sql.NVarChar(6)); // No change
        tvpOutwardBatch.columns.add('ModifiedTime', sql.DateTime); // Changed to DateTime
        tvpOutwardBatch.columns.add('Ispowerscan', sql.Bit); // No change
        tvpOutwardBatch.columns.add('DepositorAC', sql.NChar(18)); // Matched the SQL data type
        tvpOutwardBatch.columns.add('payeename', sql.NChar(30)); // Matched the SQL data type
        tvpOutwardBatch.columns.add('SM_PayeeName_Flag', sql.NChar(1)); // Matched the SQL data type
        tvpOutwardBatch.columns.add('IFSCCode', sql.NChar(11)); // Matched the SQL data type
        tvpOutwardBatch.columns.add('presentingMICR', sql.NChar(9)); // Matched the SQL data type
        tvpOutwardBatch.columns.add('GenerationDate', sql.DateTime); // Changed to DateTime
        tvpOutwardBatch.columns.add('BatchHoldBy', sql.Int); // No change
        tvpOutwardBatch.columns.add('ScannerID', sql.NVarChar(50)); // Changed to NVarChar(50)
        // tvpOutwardBatch.columns.add('BatchType', sql.NVarChar(1)); // Changed to NVarChar(1)


        outwardBatchData.forEach(row => tvpOutwardBatch.rows.add(...Object.values(row)));

        // Define the OutwardBatchScanDetailsDataTable TVP
        const tvpOutwardScanDetails = new sql.Table('OutwardBatchScanDetailsType');
        tvpOutwardScanDetails.columns.add('Upload_Id', sql.Int);
        tvpOutwardScanDetails.columns.add('ChequeID', sql.BigInt);
        tvpOutwardScanDetails.columns.add('BatchhID', sql.BigInt);
        tvpOutwardScanDetails.columns.add('BranchesnationID', sql.BigInt);
        tvpOutwardScanDetails.columns.add('ChequeNumber', sql.NVarChar(6));
        tvpOutwardScanDetails.columns.add('BranchCode', sql.VarChar(9));
        tvpOutwardScanDetails.columns.add('ChequeAccountNumber', sql.VarChar(20));
        tvpOutwardScanDetails.columns.add('Transaction_Code', sql.VarChar(3));
        tvpOutwardScanDetails.columns.add('Amount', sql.Numeric(18, 2));
        tvpOutwardScanDetails.columns.add('Status', sql.Int);
        tvpOutwardScanDetails.columns.add('Cheque_Date', sql.DateTime);
        tvpOutwardScanDetails.columns.add('IsP2F', sql.Bit);
        tvpOutwardScanDetails.columns.add('ENDNO', sql.VarChar(50));
        tvpOutwardScanDetails.columns.add('ServerImagePath', sql.VarChar(250));
        tvpOutwardScanDetails.columns.add('Frontiff', sql.VarChar(500));
        tvpOutwardScanDetails.columns.add('backtiff', sql.VarChar(500));
        tvpOutwardScanDetails.columns.add('frontjpg', sql.VarChar(500));
        tvpOutwardScanDetails.columns.add('FrontUV', sql.VarChar(500));
        tvpOutwardScanDetails.columns.add('FILEID', sql.Int);
        tvpOutwardScanDetails.columns.add('TransactionSlipID', sql.Int);
        tvpOutwardScanDetails.columns.add('SLI_MltSlpRfrnc_No', sql.Int);
        tvpOutwardScanDetails.columns.add('FRONTTIFFOFFSET', sql.Numeric(13, 0));
        tvpOutwardScanDetails.columns.add('BACKTIFFOFFSET', sql.Numeric(13, 0));
        tvpOutwardScanDetails.columns.add('FRONTJPEGOFFSET', sql.Numeric(13, 0));
        tvpOutwardScanDetails.columns.add('DIGFRONTTIFFOFFSET', sql.Numeric(13, 0));
        tvpOutwardScanDetails.columns.add('DIGBACKTIFFOFFSET', sql.Numeric(13, 0));
        tvpOutwardScanDetails.columns.add('DIGFRONTJPEGOFFSET', sql.Numeric(13, 0));
        tvpOutwardScanDetails.columns.add('FRONTTIFFSIZE', sql.Numeric(10, 0));
        tvpOutwardScanDetails.columns.add('BACKTIFFSIZE', sql.Numeric(10, 0));
        tvpOutwardScanDetails.columns.add('JPEGSIZE', sql.Numeric(10, 0));
        tvpOutwardScanDetails.columns.add('DIGFRONTSIZE', sql.Numeric(10, 0));
        tvpOutwardScanDetails.columns.add('DIGBACKSIZE', sql.Numeric(10, 0));
        tvpOutwardScanDetails.columns.add('DIGJPEGSIZE', sql.Numeric(10, 0));
        tvpOutwardScanDetails.columns.add('DIGSIGNEDMICR', sql.Char(350));
        tvpOutwardScanDetails.columns.add('BINARYFILENAME', sql.VarChar(100));
        tvpOutwardScanDetails.columns.add('MICRREPAIRFLAGES', sql.VarChar(6));
        tvpOutwardScanDetails.columns.add('P2FBANKCODE', sql.VarChar(3));
        tvpOutwardScanDetails.columns.add('Ischequeupdate', sql.Bit);
        tvpOutwardScanDetails.columns.add('IsAccountUpdate', sql.Bit);
        tvpOutwardScanDetails.columns.add('Istrcodeupdate', sql.Bit);
        tvpOutwardScanDetails.columns.add('Isamountupdate', sql.Bit);
        tvpOutwardScanDetails.columns.add('Isbranchcodeupdate', sql.Bit);
        tvpOutwardScanDetails.columns.add('returnreason', sql.VarChar(4));
        tvpOutwardScanDetails.columns.add('CreatedBy', sql.NVarChar(6));
        tvpOutwardScanDetails.columns.add('Createddate', sql.DateTime);
        tvpOutwardScanDetails.columns.add('ModifiedBy', sql.NVarChar(6));
        tvpOutwardScanDetails.columns.add('ModifieDate', sql.DateTime);
        tvpOutwardScanDetails.columns.add('Isforcefullyupdate', sql.Bit);
        tvpOutwardScanDetails.columns.add('Isrescan', sql.Bit);
        tvpOutwardScanDetails.columns.add('payeeName', sql.VarChar(250));
        tvpOutwardScanDetails.columns.add('IsChequeStatus', sql.Bit);
        tvpOutwardScanDetails.columns.add('ReasonIQA', sql.VarChar(500));
        tvpOutwardScanDetails.columns.add('PresentationDate', sql.DateTime);
        tvpOutwardScanDetails.columns.add('OutwardReturnDate', sql.DateTime);
        tvpOutwardScanDetails.columns.add('IsDelete', sql.Bit);
        tvpOutwardScanDetails.columns.add('AmountChecked', sql.Bit);
        tvpOutwardScanDetails.columns.add('IsIQA', sql.Bit);
        tvpOutwardScanDetails.columns.add('IQA_Front', sql.VarChar(20));
        tvpOutwardScanDetails.columns.add('IQA_Rear', sql.VarChar(20));
        tvpOutwardScanDetails.columns.add('IQA_FrontReason', sql.VarChar(250));
        tvpOutwardScanDetails.columns.add('IQA_RearReason', sql.VarChar(250));
        tvpOutwardScanDetails.columns.add('IsBankBlock', sql.Bit);

        // OutwardBatchScanDetailsDataTable.forEach(row => tvpOutwardScanDetails.rows.add(...Object.values(row)));

        OutwardBatchScanDetailsDataTable.forEach(row => {
            tvpOutwardScanDetails.rows.add(...Object.values(row));
        });
        // Step 3: Execute the Stored Procedure

        //  console.log("final passing parameter to SP ", dataForOutward)


        const result = await pool.request()
            .input('OutwardBatchDataTable', tvpOutwardBatch)
            .input('OutwardBatchScanDetailsDataTable', tvpOutwardScanDetails)
            .input('ClearingCode', sql.Int, 14)
            .input('DepositorAC', sql.VarChar(20), OutwardBatchScanDetailsDataTable[0]?.ChequeAccountNumber)
            .input('PresentingMICR', sql.VarChar(10), "128217602")
            .input('BatchNo', sql.Int, batchNo)
            .input('Scannerid', sql.Int, scannerId)
            .input('presentaionDate', sql.VarChar(30), date)
            .execute('SP_InsertOutwardBatchDataTable'); // Stored Procedure Name

        // Step 4: Handle the Result
        console.log('Windows to Web data ♦♦ transfer executed successfully successfully. Result:', result.recordset);

    } catch (err) {
        // Step 5: Handle Errors
        console.error('Windows to Web data ♦♦ transfer Error executing stored procedure:', err);
    } finally {
        
        if (pool) {
            await pool.close();
            console.log('Connection closed.');
        }
    }

}



module.exports={printDb, uploadOutwardBatchToWeb}