const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const webDbConfig = require("./webDbConnection")
const {dbConfig} = require("./dbConnection")

let scanData ={}
let dt;
//let pool;
// async function connectToDatabase() {
//     if (!pool) {
//         pool = new sql.ConnectionPool(webDbConfig);
//         try {
//             await pool.connect();
//             console.log('Database connected successfully!');
//         } catch (err) {
//             console.error('Database connection failed:', err);
//             process.exit(1); // Exit the app if the connection fails
//         }
//     }
//     return pool;
// }

const getScanData = (batchId)=>{
    scanData.batchId = batchId[0]?.ID
   // console.log("Batch id got from the final upload is :", scanData,"All Data  -", batchId)
    // getOutwardBatch()
     
}

const getAllScanDetails = async(req, res)=>{
try {

    let pool = await sql.connect(dbConfig);
    const result = await pool.request()
    .input('BatchID', sql.BigInt, scanData.batchId)
    .execute("GetOutwardBatchDetails_mob")

   // let pool_2 = await sql.connect(dbConfig);
    const detailscanResult = await pool.request()
    .input('BatchhID', sql.BigInt, scanData.batchId)
    .execute("GetOutwardBatchScanDetails_mob")
        
    const data =  result.recordset
    const scanDetails = detailscanResult.recordset
    console.log("Detailed Data   ;", scanDetails)
    return res.status(200).json(
        {
            batchData:data,
            scanDetails: scanDetails
        }

    )
    
} catch (error) {
    console.log("db error : ", error)
    return res.status(500).json({
        res_code: 0,
        status: "error",
        error: `Database error ${error}`
    })
}
}

const getOutwardBatch = async()=>{
    let pool = await sql.connect(dbConfig);
    const result = await pool.request()
    .input('BatchID', sql.BigInt, scanData.batchId)
    .execute("GetOutwardBatchDetails_mob")

   console.log("data recieved from RBLCTSWIN DB  :",result.recordset)
  // return  result.recordset
   const outwardBatchData = result.recordset

   //insertOutwardBatch_2()
 // console.log("*♠♠♠♠♠♠    :",outwardBatchData)
 
   //////////////////////////////////////////////////////////////


   try {
    // Step 1: Connect to the database
    let pool = await sql.connect(webDbConfig);
    console.log("Web pool:", pool)
    console.log("Web pool:", webDbConfig)
 
  
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
        .input('BatchNo', sql.Int, OutwardBatchDataTable[0]?.batchNo)
        .input('Scannerid', sql.Int, OutwardBatchDataTable[0]?.ScannerID)
        .input('presentaionDate', sql.VarChar(30), '20/12/2024')
        .execute('SP_InsertOutwardBatchDataTable'); // Stored Procedure Name

    // Step 4: Handle the Result
    console.log('Windows to Web data ♦♦ transfer executed successfully successfully. Result:', result.recordset);

} catch (err) {
    // Step 5: Handle Errors
    console.error('Windows to Web data ♦♦ transfer Error executing stored procedure:', err);
} finally {
    // Step 6: Close the Database Connection
    sql.close();
}

}



const presentationDate = new Date('2024-12-20');

// Convert to SQL Server format (YYYY-MM-DD HH:MM:SS)
const formattedDate = presentationDate.toISOString().slice(0, 19).replace('T', ' ');


// Input Data: Table-Valued Parameters (TVP)
const OutwardBatchDataTable = [
    {
        BatchID: 8907178,
        BranchescNationD: null,
        BankID: 3,
        batchNo: 123,
        ClearingID: 14,
        ChequeCount: 5,
        TotalAmount: 1000.50,
        DataFileName: 'Test_file1',
        BatchStatusID: 1,
        PresentationDate: formattedDate,
        ProcessingBatchNo: null,
        DigitalSignatureID: null,
        CreatedBy: '1',
        CreatedTime: new Date(),
        ModifiedBy: null,
        ModifiedTime: null,
        Ispowerscan: null,
        DepositorAC: null,
        payeename: 'ABC Corp',
        SM_PayeeName_Flag: null,
        IFSCCode: null,
        presentingMICR: '4',
        GenerationDate: null,
        BatchHoldBy: null,
        ScannerID: '70002',
        BatchType: '1'


    }
];


const OutwardBatchScanDetailsDataTable = [
    {
        Upload_Id: 1,
        ChequeID: 123456,
        BatchhID: 78910,
        BranchesnationID: 123,
        ChequeNumber: "100001",
        BranchCode: "123456",
        ChequeAccountNumber: "9876543210",
        Transaction_Code: "001",
        Amount: 1500.25,
        Status: 1,
        Cheque_Date: new Date(),
        IsP2F: true,
        ENDNO: "KIRAN123",
        ServerImagePath: "path/to/server/image1",
        Frontiff: "path/to/front1.tiff",
        backtiff: "path/to/back1.tiff",
        frontjpg: "path/to/front1.jpg",
        FrontUV: "path/to/front1_uv.jpg",
        FILEID: 101,
        TransactionSlipID: 201,
        SLI_MltSlpRfrnc_No: 301,
        FRONTTIFFOFFSET: 12345,
        BACKTIFFOFFSET: 54321,
        FRONTJPEGOFFSET: 11223,
        DIGFRONTTIFFOFFSET: 44556,
        DIGBACKTIFFOFFSET: 77889,
        DIGFRONTJPEGOFFSET: 99000,
        FRONTTIFFSIZE: 500,
        BACKTIFFSIZE: 500,
        JPEGSIZE: 1000,
        DIGFRONTSIZE: 400,
        DIGBACKSIZE: 400,
        DIGJPEGSIZE: 800,
        DIGSIGNEDMICR: "MICR123456",
        BINARYFILENAME: "binaryfile1",
        MICRREPAIRFLAGES: "FL123",
        P2FBANKCODE: "001",
        Ischequeupdate: false,
        IsAccountUpdate: false,
        Istrcodeupdate: false,
        Isamountupdate: false,
        Isbranchcodeupdate: false,
        returnreason: "R001",
        CreatedBy: "USR01",
        Createddate: new Date(),
        ModifiedBy: "USR02",
        ModifieDate: new Date(),
        Isforcefullyupdate: true,
        Isrescan: false,
        payeeName: "Payee A",
        IsChequeStatus: false,
        ReasonIQA: "None",
        PresentationDate: new Date(),
        OutwardReturnDate: null,
        IsDelete: false,
        AmountChecked: true,
        IsIQA: false,
        IQA_Front: "Good",
        IQA_Rear: "Good",
        IQA_FrontReason: "N/A",
        IQA_RearReason: "N/A",
        IsBankBlock: false
    },
    {
        Upload_Id: 2,
        ChequeID: 654321,
        BatchhID: 78911,
        BranchesnationID: 124,
        ChequeNumber: "100002",
        BranchCode: "123457",
        ChequeAccountNumber: "9876543211",
        Transaction_Code: "002",
        Amount: 2500.75,
        Status: 1,
        Cheque_Date: new Date(),
        IsP2F: true,
        ENDNO: "KIRAN124",
        ServerImagePath: "path/to/server/image2",
        Frontiff: "path/to/front2.tiff",
        backtiff: "path/to/back2.tiff",
        frontjpg: "path/to/front2.jpg",
        FrontUV: "path/to/front2_uv.jpg",
        FILEID: 102,
        TransactionSlipID: 202,
        SLI_MltSlpRfrnc_No: 302,
        FRONTTIFFOFFSET: 22345,
        BACKTIFFOFFSET: 64321,
        FRONTJPEGOFFSET: 21223,
        DIGFRONTTIFFOFFSET: 54556,
        DIGBACKTIFFOFFSET: 87889,
        DIGFRONTJPEGOFFSET: 99001,
        FRONTTIFFSIZE: 600,
        BACKTIFFSIZE: 600,
        JPEGSIZE: 1200,
        DIGFRONTSIZE: 500,
        DIGBACKSIZE: 500,
        DIGJPEGSIZE: 1000,
        DIGSIGNEDMICR: "MICR654321",
        BINARYFILENAME: "binaryfile2",
        MICRREPAIRFLAGES: "FL124",
        P2FBANKCODE: "002",
        Ischequeupdate: true,
        IsAccountUpdate: false,
        Istrcodeupdate: true,
        Isamountupdate: true,
        Isbranchcodeupdate: false,
        returnreason: "R002",
        CreatedBy: "USR03",
        Createddate: new Date(),
        ModifiedBy: "USR04",
        ModifieDate: new Date(),
        Isforcefullyupdate: false,
        Isrescan: true,
        payeeName: "Payee B",
        IsChequeStatus: true,
        ReasonIQA: "Image Issue",
        PresentationDate: new Date(),
        OutwardReturnDate: null,
        IsDelete: false,
        AmountChecked: true,
        IsIQA: true,
        IQA_Front: "Poor",
        IQA_Rear: "Good",
        IQA_FrontReason: "Blurred Image",
        IQA_RearReason: "N/A",
        IsBankBlock: false
    }
];

//Function to call the stored procedure


async function insertOutwardBatch_2() {
    
//    console.log(outwardBt)

    try {
        // Step 1: Connect to the database
        let pool = await sql.connect(webDbConfig);

      
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
        tvpOutwardBatch.columns.add('BatchType', sql.NVarChar(1)); // Changed to NVarChar(1)


        OutwardBatchDataTable.forEach(row => tvpOutwardBatch.rows.add(...Object.values(row)));
       
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
            .input('BatchNo', sql.Int, OutwardBatchDataTable[0]?.batchNo)
            .input('Scannerid', sql.Int, OutwardBatchDataTable[0]?.ScannerID)
            .input('presentaionDate', sql.VarChar(30), '20/12/2024')
            .execute('SP_InsertOutwardBatchDataTable'); // Stored Procedure Name

        // Step 4: Handle the Result
        console.log('Windows to Web data ♦♦ transfer executed successfully successfully. Result:', result.recordset);

    } catch (err) {
        // Step 5: Handle Errors
        console.error('Windows to Web data ♦♦ transfer Error executing stored procedure:', err);
    } finally {
        // Step 6: Close the Database Connection
        sql.close();
    }
}

// Call the function
//insertOutwardBatch();


module.exports = { getScanData, insertOutwardBatch_2, getAllScanDetails };