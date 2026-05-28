let express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const sharp = require('sharp');
const sql = require('mssql');
const { dbConfig } = require("../db/dbConnection");
const { executeProcedure, uploadImageSchema, getfolderPath, chequeRescanValidation_folder , getServerfolderPath} = require("../db/uploadImagesp");
const { error } = require("console");
const { exec } = require('child_process');
const logger = require("../logging/logger")
const{authenticateToken} = require("../cipher/jwtToken")
// let app = express()
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


// Helper function to safely count files in a directory
const countFilesInBatch = async (uploadPath) => {
    try {
        const files = await fs.readdir(uploadPath).catch(() => []);
        return files.length;
    } catch (error) {
        return 0;
    }
};



async function convertToTiffWithMagic(uploadPath, filename) {
    try {
        const inputFilePath = path.join(uploadPath, filename);
        // const outputFilePath = path.join(uploadPath, filename.replace(path.extname(filename), '.tiff'));

        const outputFilePath = path.join(path.dirname(uploadPath), `${path.basename(filename, path.extname(filename))}.tif`);
        //-background white -flatten
        const command = `magick "${uploadPath}" -resize 1600x725 -gamma 1.2 -define tiff:photometric=min-is-white -define tiff:rows-per-strip=736 -compress Group4 -density 200  "${outputFilePath}"`


        // Execute the ImageMagick command
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    logger.error(error)
                    console.error(`ImageMagick error: ${stderr}`);
                    reject(new Error(`ImageMagick processing failed: ${stderr}`));
                } else {
                    console.log(`Processed TIFF saved to: ${outputFilePath}`);
                    resolve();
                }
            });
        });

        return outputFilePath;
    } catch (error) {
        logger.error(error)
        console.error(`Error converting ${filename} to TIFF:`, error.message);
        throw error;
    }
}



const processMainImage = async (filePath, filename) => {
    try {
        // Define the output path
        const outputFilePath = path.join(path.dirname(filePath), `${path.basename(filename, path.extname(filename))}.jpg`);


        //-sharpen 1x1  -gamma 0.5 -brightness-contrast 8x2 
        const command = `magick "${filePath}"  -resize 2320x1092  -sharpen 0x1.5 -gamma 0.9 -density 300 -units PixelsPerInch -quality 70 "${outputFilePath}"`

        // Execute the command
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    logger.error(error)
                    console.error('Error in processing image:', stderr);
                    reject(new Error('Image processing failed.'));
                } else {
                    console.log(`Processed image saved at: ${outputFilePath}`);
                    resolve();
                }
            });
        });

        return outputFilePath; // Return the path to the processed image
    } catch (error) {
        logger.error(error)
        console.error('Error in processing image:', error);
        throw new Error('Image processing failed.');
    }
};


const processImage = async (inputPath, outputPath, filename) => {
    //const outputFilePath = path.join(outputPath, path.basename(filename, path.extname(filename)) + '.jpg');
    await sharp(inputPath)
        // .resize(1200, 550)
        .grayscale() // Convert to grayscale
        .jpeg({
            // compression: 'ccittfax4',
            // bitdepth: 1,
            // xres: 75,
            // yres: 75,
            compression: 'ccittfax4',
            bitdepth: 1,
            //  predictor: 'none',
            // density: 600



        })
        // .modulate({ brightness: 1.5 }) // Increase brightness by 1.5 times
        .withMetadata({ density: 300 })
        .toFile(outputPath); // Save processed image
};



const formatfileName = (date, batchno, count) => {
    const [year, month, day] = date.split('-');
    const dt = `${month}${day}${year}`
    const batchnoId = String(batchno).padStart(4, '0');

    const chequIdName = String(count).padStart(3, '0');
    return `${dt}${batchnoId}${chequIdName}`;
}

// Multer configuration for file uploads

let name;
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const { date, scannerId, batchNo, chequCount, cheque_micr, cheque_chequeNo, cheque_trCode, cheque_rbiAccNo } = req.body;

        console.log("initial multer storage --:", req.body,)
        try {
            // Validate required fields
            if (!date || !scannerId || !batchNo) {
                return cb(new Error('date, scannerId, and batchNo are required'));
            }

            if (!chequCount || isNaN(parseInt(chequCount))) {
                console.error(`Invalid chequCount: ${chequCount}. Please ensure chequCount is sent in request body.`);
                return cb(new Error('Invalid chequCount. chequCount must be a valid number and is required.'));
            }

            const validChequCount = parseInt(chequCount);

            const isScannedResult = await chequeRescanValidation_folder(cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode).catch(error => {
                console.error('Cheque validation failed:', isScannedResult);
                return cb(new Error('Error during cheque validation.'));
            });
            console.log("chequeRescanValidation_folder", isScannedResult)

            // console.log("chequeRescanValidation_folder parameter:   ", date, scannerId, batchNo, chequCount, cheque_micr, cheque_chequeNo, cheque_trCode, cheque_rbiAccNo)
            console.log("chequeRescanValidation_folder___1:", "cheque_chequeNo:", cheque_chequeNo, "cheque_micr:", cheque_micr, "cheque_rbiAccNo:", cheque_rbiAccNo, "cheque_trCode:", cheque_trCode)


            if (isScannedResult && isScannedResult.success === false) {
                // Block upload if cheque is already scanned
                console.log("is scann first: ", isScannedResult)
                return cb(new Error('Cheque already scanned'));
            }

            console.log('Cheque not scanned. Proceeding...');

            const folderDate = req.body.date;
            //const uploadPath = path.join(__dirname, 'uploads', date, scannerId, batchNo);
            const uploadPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
            // Ensure the folder exists
            await fs.ensureDir(uploadPath).catch((err) => {
                console.error('Error ensuring directory:', err);
                return cb(new Error(`Error ensuring directory : ${err}`));
            });

            // Check if the folder already has reached maximum file limit
            // Each cheque generates 6+ files (2 original images + 2 TIFFs + 2 temp processed images + others)
            const fileCount = await countFilesInBatch(uploadPath);
            const maxFilesExpected = validChequCount * 6;
            
            console.log(`Current files: ${fileCount}, Max expected: ${maxFilesExpected}, ChequCount: ${validChequCount}`);
            
            if (fileCount >= maxFilesExpected) {
                console.log(`Batch full: ${fileCount} files >= ${maxFilesExpected} max`);
                return cb(new Error('Batch full')); // Skip file upload
            }

            name = formatfileName(date, batchNo, Math.ceil(fileCount / 6) + 1)

            cb(null, uploadPath);


        } catch (error) {
            logger.error(error)
            console.log("multer disk=", error)
            return cb(new Error('Error processing the upload destination.'));

        }

    },

    filename: async (req, file, cb) => {
        const { cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode } = req.body
        console.log("Rename function--: ", req.body)

        console.log("Rename function--: ", "cheque_chequeNo:", cheque_chequeNo, "cheque_micr:", cheque_micr, "cheque_rbiAccNo:", cheque_rbiAccNo, "cheque_trCode:", cheque_trCode)
        const isScann = await chequeRescanValidation_folder(cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode).catch(error => {
            logger.error(error)
            console.error('Cheque validation failed:', error);
            return cb(new Error('Error during cheque validation.'));
        });
        try {
            if (isScann && isScann.success === false) {
                return cb(new Error('Cheque already scanned'));
                //  return cb(new Error('Error generating file name.', error))
            } else {

                console.log("file.originalname", file.originalname)
                //const outputFileName =  file.originalname.replace(path.extname(filename), '.jpg');
                const timestamp = Date.now();
                const nm = file.originalname.split('.')[0] + ".jpg"
                console.log("file.originalname------", nm)
                const uniqueName = `${name}${nm}`;
                cb(null, uniqueName);

            }


        } catch (error) {
            logger.error(error)
            cb(new Error('Error generating file name.', error));
        }

    }
});



const upload = multer({
    storage,
    fileFilter: async (req, file, cb) => {
        console.log("multer storage validation --:", req.body,)
        const { date, scannerId, batchNo, chequCount, cheque_micr, cheque_chequeNo, cheque_trCode, cheque_rbiAccNo } = req.body;
        const isScannedResult = await chequeRescanValidation_folder(cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode).catch(error => {
            logger.error(error)
            console.error('Cheque validation failed:', isScannedResult);
            return cb(new Error('Error during cheque validation.'));
        });
        const allowedTypes = ['image/png', 'image/jpeg', 'application/octet-stream', 'image/tiff', 'image/x-tiff', 'image/bmp'];
        // if (!allowedTypes.includes(file.mimetype)) {
        //     return cb(new Error('Unsupported file type.'));
        // }

        if (isScannedResult && isScannedResult.success === false) {
            // Block upload if cheque is already scanned
            console.log("is scann first: ", isScannedResult)
            return cb(new Error('Cheque already scanned'));
        }

        cb(null, true);
    },
}).fields([
    { name: 'images', maxCount: 2 } // Two image files
    // Two binary files
]);

const depositSlipStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const { date, scannerId, batchNo } = req.body;
            if (!date || !scannerId || !batchNo) {
                return cb(new Error('date, scannerId, and batchNo are required'));
            }
            const uploadPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
            await fs.ensureDir(uploadPath);
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname) || '';
        const safeName = `deposit_slip_${timestamp}${ext}`;
        cb(null, safeName);
    }
});

const depositSlipUpload = multer({
    storage: depositSlipStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf', 'image/tiff', 'image/x-tiff', 'image/bmp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Unsupported deposit slip file type'));
        }
        cb(null, true);
    }
}).single('depositSlip');

const cleanupSingleFile = async (file) => {
    if (!file || !file.path) return;
    try {
        await fs.unlink(file.path);
        console.log(`Deleted file: ${file.path}`);
    } catch (error) {
        logger.error(error);
        console.error('Error deleting file:', error);
    }
};

router.post('/uploadDepositSlip', async (req, res) => {
    depositSlipUpload(req, res, async (err) => {
        if (err) {
            logger.error(err);
            console.error('Deposit slip upload error:', err);
            return res.status(400).json({
                res_code: 0,
                message: err.message || 'Error uploading deposit slip.'
            });
        }

        const { date, scannerId, batchNo, batchId } = req.body;
        if (!date || !scannerId || !batchNo || !batchId) {
            await cleanupSingleFile(req.file);
            return res.status(400).json({
                res_code: 0,
                message: 'date, scannerId, batchNo, and batchId are required.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                res_code: 0,
                message: 'Deposit slip file is required.'
            });
        }

        try {
            const pool = await sql.connect(dbConfig);
            const result = await pool.request()
                .input('batchId', sql.BigInt, parseInt(batchId, 10))
                .query('SELECT is_DepositeSlip FROM OutwardBatch WHERE BatchID = @batchId');
            await pool.close();

            const batch = result.recordset && result.recordset[0];
            if (!batch) {
                await cleanupSingleFile(req.file);
                return res.status(404).json({
                    res_code: 0,
                    message: 'Batch not found.'
                });
            }

            const isDepositSlipEnabled = batch.is_DepositeSlip === true || batch.is_DepositeSlip === 1;
            if (!isDepositSlipEnabled) {
                await cleanupSingleFile(req.file);
                return res.status(200).json({
                    res_code: 0,
                    message: 'This deposit slip is not checked for this batch.'
                });
            }

            return res.status(200).json({
                res_code: 1,
                message: 'Deposit slip uploaded successfully.',
                fileName: req.file.filename,
                uploadPath: req.file.path
            });
        } catch (error) {
            logger.error(error);
            await cleanupSingleFile(req.file);
            return res.status(500).json({
                res_code: 0,
                message: `Database error ${error}`
            });
        }
    });
});

module.exports = { upload }

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

            archive.on('error', (err) => reject(err));

            archive.pipe(output);
            archive.directory(folderPath, false);
            archive.finalize();
        });

    } catch (error) {
        logger.error(error)
        console.log(error)
    }


};

//main api url :  /uploadChequeImage


const preValidationMiddleware = async (req, res, next) => {
    try {
        // Note: Validation of form fields will happen INSIDE the upload handler
        // after multer has processed the request, since we're using multipart/form-data
        next();
    } catch (error) {
        logger.error(error)
        console.error('Pre-validation error:', error);
        res.status(500).json({
            res_code: 0,
            error: 'Error during cheque pre-validation.',
        });
    }
};

const cleanupUploadedFiles = async (files) => {
    if (!files || files.length === 0) return;
    try {
        for (const file of files) {
            await fs.unlink(file.path); // Remove the file
            console.log(`Deleted file: ${file.path}`);
        }
    } catch (error) {
        logger.error(error)
        console.error('Error during file cleanup:', error);
    }
}



router.post('/uploadChequeImage', preValidationMiddleware, async (req, res) => {
   
    upload(req, res, async (err) => {
        if (err) {
            logger.error(err)
            console.error("Multer error:", err);
            stausCode = (err.message === "Cheque already scanned") ? 200 : 400
            await cleanupUploadedFiles(req.files?.images || []);
            return res.status(200).json({
                res_code: 0,
                message: err.message || "Error uploading images."
            });
        }

        try {
            // Validate form fields AFTER multer has processed the request
            const { date, scannerId, batchNo, chequCount, cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode } = req.body;

            if (!date || !scannerId || !batchNo) {
                await cleanupUploadedFiles(req.files?.images || []);
                return res.status(400).json({
                    res_code: 0,
                    message: "date, scannerId, and batchNo are required"
                });
            }

            if (!chequCount || isNaN(parseInt(chequCount))) {
                console.error(`Invalid chequCount from form-data: ${chequCount}`);
                await cleanupUploadedFiles(req.files?.images || []);
                return res.status(400).json({
                    res_code: 0,
                    message: "chequCount is required and must be a valid number"
                });
            }

            if (!cheque_chequeNo || !cheque_micr || !cheque_rbiAccNo || !cheque_trCode) {
                await cleanupUploadedFiles(req.files?.images || []);
                return res.status(400).json({
                    res_code: 0,
                    message: "cheque_chequeNo, cheque_micr, cheque_rbiAccNo, and cheque_trCode are required"
                });
            }

            console.log("Validation passed. Processing upload...");

            const { images } = req.files;
            const files = req.files;
            console.log("Files  :", req.files)

            console.log("/uploadChequeImage end point  --:", req.body,)

            const { userId, branchnationId, branchMicr, batchId, chequeSrNo, cheque_accNo, cheque_amt, endNo } = req.body;

            // Validate additional required parameters
            if (!batchId) {
                await cleanupUploadedFiles(req.files?.images || []);
                return res.status(400).json({
                    res_code: 0,
                    message: "batchId is required"
                });
            }

            console.log("Main api  :--  ", "date:", date, "scannerId:", scannerId, "userId:", userId, "branchnationId:", branchnationId, "branchMicr:", branchMicr, "batchId:", batchId, "batchNo:", batchNo, "chequCount", chequCount, "chequeSrNo:", chequeSrNo, "cheque_accNo:", cheque_accNo, "cheque_micr:", cheque_micr, "cheque_chequeNo:", cheque_chequeNo, "cheque_trCode:", cheque_trCode, "cheque_rbiAccNo:", cheque_rbiAccNo, "cheque_amt", cheque_amt, "endNo", endNo)

            const frontFile = files.images.find(file => file.originalname.startsWith('F'));
            const backFile = files.images.find(file => file.originalname.startsWith('R'));

            const frontGeneratedName = frontFile?.filename;
            const backGeneratedName = backFile?.filename;
            const backtiffName = backGeneratedName?.split('.')[0]+'.tif'
            const fronttiffName = frontGeneratedName?.split('.')[0]+'.tif'

            const folderKey = `${date}_${scannerId}_${batchNo}`;
            // const uploadPath = path.join(__dirname, 'uploads', date, scannerId, batchNo);
            const uploadPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
            const backTiff = backtiffName;
            const frontTiff = fronttiffName;
            // const fname = `${name}${files[0]?.originalname}`
            const fname = `${name}${files[0]?.filename}`
            console.log(frontGeneratedName)
            const frontJpeg = frontGeneratedName
            const transactionSlipID = 1
            const statusCode = 3;
            const isp2f = 1;
            //const imagePath = uploadPath
            const chequeId = 0
            const frontUV = "";
            const iqa = "";
            //const serverImagePath = uploadPath;
            const serverPathFromDb = await getServerfolderPath()
            console.log("Server path : ", serverPathFromDb)
            const modified_date = date.split("-").join("")
           // const serverImagePath = '\\View\\Outward\\Images\\'+modified_date+"\\"+scannerId+"\\"+batchNo+"\\"
           const serverImagePath = serverPathFromDb?.trim()+modified_date+"\\"+scannerId+"\\"+batchNo+"\\"
            const imagePath = serverImagePath
            const slipno = 0
            const batchuId = Number(batchId)
            // const validCheque_amt = cheque_amt?cheque_amt: 100
            const params = { batchId, branchnationId, cheque_chequeNo, cheque_rbiAccNo, cheque_trCode, cheque_amt, userId, backTiff, frontTiff, frontJpeg, transactionSlipID, cheque_micr, statusCode, imagePath, isp2f, chequeId, endNo, date, frontUV, iqa, scannerId, serverImagePath, slipno }


            const result = await executeProcedure(params)
            console.log("Dataaaaa_111111", result)

            if (result[0]['scannedChequeId'] === 0) {
                return res.status(200).json({
                    res_code: 0,
                    message: "Cheque is already scanned.......1",
                    data: result

                });
            }
            else {

                // Validate the presence of exactly 2 files
                if (!files || files.length < 2) {
                    // await cleanupUploadedFiles(images);
                    return res.status(200).json({
                        res_code: 0,
                        error: "Two images are required."
                    });
                }

                // Count actual files in batch for response
                const actualFileCount = await countFilesInBatch(uploadPath);
                const chequeNumber = Math.ceil(actualFileCount / 6);
                const validChequCount = parseInt(chequCount);
                
                // const files = req.files;
                // const { date, scannerId, batchNo } = req.body;
                // const uploadPath = path.join(__dirname, '..', 'CTS_uploads', req.body.date, req.body.scannerId, req.body.batchNo);

                // Convert uploaded images to TIFF format
                for (const file of images) {
                    console.log(`Original file saved at -----------: ${file.filename}`);
                    await processMainImage(file.path, file.filename);
                    console.log(`Original file saved at: ${file.filename}`);
                    // const tiffPath = await convertToTiff(uploadPath, file.filename);

                    //  const tiffPath = await convertToTiffWithMagic(uploadPath, file.filename);

                    const tiffPath = await convertToTiffWithMagic(file.path, file.filename);


                    console.log(`Converted TIFF saved at: ${tiffPath}`);
                    const processedPath = path.join(uploadPath, `Temp${file.filename}`);
                    //await processImage(file.path, processedPath);
                    await processImage(tiffPath, processedPath, file.filename);
                    console.log(`Processed image saved at: ${processedPath}`);

                }

                const uploadedFiles = await fs.readdir(uploadPath);
                if (uploadedFiles.length >= validChequCount * 6) {
                    return res.status(200).json({
                        res_code: 4,
                        message: 'Folder is full. Cannot upload more files.',
                    });
                }

                return res.status(200).json({
                    res_code: 1,
                    message: "Image and Data successfully uploaded",
                    res_forChequeNo: chequeNumber,
                    RemainingChequeCount: validChequCount - chequeNumber,
                    data: result
                });

   
            }


        } catch (error) {
            logger.error(error)
            console.error('Error during file processing:', error);
            await cleanupUploadedFiles(req.files?.images || []);
            return res.status(200).json({
                res_code: 0,
                message: 'Server error during file processing. Plese Try again',
            });
        }
    });
});

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


    const response = await axios.post('https://192.168.100.100/WebService/CTS_WebService.asmx', soapRequest, {
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '"http://tempuri.org/UploadFilesTest"'
        }
    });
}


// router.post("/finalUpload", async (req, res) => {
//     try {
//         const { date, scannerId, batchId, batchNo, chequeCount } = req.body;

//         const zipFolderPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId);  // Source folder
//         const zipFileName = `${batchNo}.zip`;
//         const zipFilePath = path.join(zipFolderPath, zipFileName); // Path to save zip file

//         // const destinationPath = path.join('D:', 'CTS', 'images',date,scannerId); // Final destination path
//         const pathFromDb = await getfolderPath()
//         console.log("DatabAse Path -----:>", pathFromDb)

//         const destinationPath = path.join(pathFromDb.trim(), date, scannerId); // Final destination path
//         // Check if the folder exists
//         if (!fs.existsSync(zipFolderPath)) {
//             return res.status(400).json({
//                 res_code: 0,
//                 error: "Folder not found."
//             });
//         }

//         const uploadPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
//         const zipPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, `${batchNo}.zip`);
//         await zipFolder(uploadPath, zipPath);

//         // Move the zip to the destination path
//         const finalZipPath = path.join(destinationPath, zipFileName);

//         // Ensure destination folder exists
//         if (!fs.existsSync(destinationPath)) {
//             fs.mkdirSync(destinationPath, { recursive: true });
//         }

//         // Move the file
//         fs.renameSync(zipFilePath, finalZipPath);

//         return res.status(200).json({
//             res_code: 1,
//             message: "Folder zipped and moved successfully.",
//             zipPath: finalZipPath
//         });




//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             res_code: 0,
//             error: error.message || error
//         });
//     }

// })


module.exports = router;