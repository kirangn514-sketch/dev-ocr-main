let express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { getfolderPath } = require("../db/uploadImagesp");
const { getScanData, insertOutwardBatch_2 } = require("../db/finalWebUpload")
const logger = require("../logging/logger")
const { dbConfig, serverIp } = require("../db/dbConnection")

const insertBatchCreation = {}
let param;

exports.getData = async (data) => {

    console.log("Data from batch creation :", data)
    param = data

    // insertOutwardBatch_2()

}


// Function to zip a folder
const zipFolder = (folderPath, zipPath) => {
    try {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`Zipped ${archive.pointer()} total bytes`);
                resolve();
            });

            archive.on('error', (err) => reject("zipFolder--", err));

            archive.pipe(output);
            archive.directory(folderPath, false);
            archive.finalize();
        });

    } catch (error) {
        logger.error(error)
        console.log(error)
    }


};

const unzipFolder = (zippath, unzippath) => {

    try {
        let zip = new AdmZip(zippath);
        //let zipEntries = zip.getEntries();

        const zipDir = path.dirname(unzippath);

        // Extract all files to the same directory
        //zip.extractAllTo(zipDir, true);

        zip.extractAllTo(unzippath, true);

    } catch (error) {
        logger.error(error)
        console.log(error)
    }
}








const convertZipToBase64 = (filePath) => {
    try {
        // Read the zip file as binary data (buffer)
        const fileBuffer = fs.readFileSync(filePath);

        // Convert the buffer into a base64 string
        const base64String = fileBuffer.toString('base64');

        return base64String;
    } catch (err) {
        console.error("Error reading file: ", err);
        throw err;
    }
};


const executeWebService = async (soapRequest) => {


    const response = await axios.post('https://192.168.100.100:9696/WebService/CTS_WebService.asmx', soapRequest, {
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '"http://tempuri.org/UploadFilesTest"'
        }
    });
}


exports.finalUpload = async (req, res) => {
    try {
        const { date, scannerId, batchNo, chequeCount } = req.body;

        // batchId

        const modifiedDate = date.split("-").join("")

        const zipFolderPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId);  // Source folder
        const zipFileName = `${batchNo}.zip`;
        const zipFilePath = path.join(zipFolderPath, zipFileName); // Path to save zip file


        // const destinationPath = path.join('D:', 'CTS', 'images',date,scannerId); // Final destination path
        const pathFromDb = await getfolderPath()
        console.log("DatabAse Path -----:>", pathFromDb)

        const destinationPath = path.join(pathFromDb.trim(), modifiedDate, scannerId); // Final destination path
        const unzippath = path.join(pathFromDb.trim(), modifiedDate, scannerId, batchNo);
        // Check if the folder exists
        if (!fs.existsSync(zipFolderPath)) {
            return res.status(400).json({
                res_code: 0,
                error: "Folder not found"
            });
        }

        const uploadPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
        const zipPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, `${batchNo}.zip`);
        await zipFolder(uploadPath, zipPath);

        // Move the zip to the destination path
        const finalZipPath = path.join(destinationPath, zipFileName);

        // Ensure destination folder exists
        if (!fs.existsSync(destinationPath)) {
            fs.mkdirSync(destinationPath, { recursive: true });
        }

        // Move the file 
        fs.renameSync(zipFilePath, finalZipPath);

        //console.log("Priint param", param)
        const queryData = { ...param }
        //  console.log("Priint param        --:", param[0]?.ID)

        // date, scannerId, batchId, batchNo
        const batchId = param[0]?.ID
        // date, scannerId, batchNo, batchId
        const resultUploadToWeb = await axios.post(`http://${serverIp}:5003/cts/uploadOutwardBatchToWeb`, { date, scannerId, batchNo, batchId })
        const batchData = resultUploadToWeb

        console.log("Transfer Batch Data : ", batchData?.data)
        unzipFolder(finalZipPath, unzippath)

        //-------------------------------------
        // getScanData(param)
        //await insertOutwardBatch(param)
        //

        return res.status(200).json({
            res_code: 1,
            message: "Folder zipped and moved successfully",
            zipPath: finalZipPath
        });

    } catch (error) {
        console.log(error);
        logger.error(error)
        return res.status(500).json({
            res_code: 0,
            error: error.message || error
        });
    }

}



exports.finalUploadQueList = async (req, res) => {
    try {
        const { date, scannerId } = req.body;

        const modifiedDate = date.split("-").join("")

        const zipFolderPath = path.join(__dirname, '..', 'CTS_uploads', date);  // Source folder

        // check folder exists
        if (!fs.existsSync(zipFolderPath)) {
            return res.status(200).json({
                success: false,
                message: "Date folder not found"
            });
        }

        const batches = await fs.promises.readdir(zipFolderPath, { withFileTypes: true });
        const batchFolders = batches
            .filter(dirent => dirent.isDirectory())
            .map(dirent => ({
                batchName: dirent.name,
                batchPath: path.join(zipFolderPath, dirent.name)
            }));

        res.status(200).json({
            success: true,
            scannerId : scannerId,
            date: date,
            batches: batchFolders,
            message: "batch fetch successfully"
        });


    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

}


