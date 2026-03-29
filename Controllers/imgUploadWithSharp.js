let express = require("express");
const router = express.Router();
const axios = require("axios");
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const sharp = require('sharp');
const { executeProcedure, uploadImageSchema, getfolderPath, chequeRescanValidation_folder } = require("../db/uploadImagesp");
const { error } = require("console");
// let app = express()
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


const folderCounts = {};

const remainingCount = (lenght, max) => {
    let count = 0
    // Check if the array has space for new values
    if (lenght + 2 <= max) {

        const remainingSpace = count++; // Calculate remaining space

        return remainingSpace;
    } if (lenght === max) {
        //console.log("Array is full. Count has been reset.");
        count = 0; // Reset the count when the array is full
    }

}

// Function to convert JPEG to TIFF
// Function to convert images to TIFF format and save them in the same folder
async function convertToTiffWithSharp(uploadPath, filename) {
    try {
        const inputFilePath = path.join(uploadPath, filename);
        const outputFilePath = path.join(uploadPath, filename.replace(path.extname(filename), '.tif'));

        // Use sharp to convert the image to TIFF lzw
        await sharp(inputFilePath)
            .resize(1600, null)
            .grayscale()
            // .greyscale()
            //.threshold(128)
            .flatten({ background: '#fff' })
            .toColourspace('b-w')
            
            .tiff({
                // compression: 'ccittfax4',
                // bitdepth: 1,
                xres: 7.89,
                yres: 7.89,

                bitdepth: 1,
                compression: 'ccittfax4',
                predictor: 'none',
                //density: 200



            })
            //.withMetadata({ density: 60 })

            .toFile(outputFilePath);

        console.log(`Converted ${filename} to TIFF format.`);
        return outputFilePath;
    } catch (error) {
        console.error(`Error converting ${filename} to TIFF:`, error);
        console.error(`Error converting ${filename} to TIFF:`, error.message, error.stack);
        throw error;
    }
}


const processMainImagewithSharp = async (inputPath) => {
    try {
        // Create a temporary file path for the processed image
        const tempFilePath = inputPath + '.tmp';

        // Process the image and save it to the temporary file
        await sharp(inputPath)
            .resize(2315, 1092) // Resize the image
            .grayscale() // Convert to grayscale
            .jpeg({ bitdepth: 8 }) // Save as JPEG with specific options
            .withMetadata({ density: 300 }) // Add metadata
            .toFile(tempFilePath); // Save to temporary file

        // Replace the original file with the processed file
        fs.renameSync(tempFilePath, inputPath);

        console.log(`Image processed and replaced: ${inputPath}`);
    } catch (error) {
        console.error('Error processing image:', error.message);
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




// Function to execute stored procedure with parameters




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
        try {

            //console.log("disk----", req.body)

            const { date, scannerId, batchNo, chequCount, cheque_micr, cheque_chequeNo, cheque_trCode, cheque_rbiAccNo } = req.body;

            const isScann = await chequeRescanValidation_folder(cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode).catch(error => {
                console.error('Cheque validation failed:', error);
                return cb(new Error('Error during cheque validation.'));
            });
            console.log("is scann------>  ", isScann)



            try {

                if (isScann && isScann.success === false) {
                    return cb(new Error('Cheque is already scanned'));
                    //return cb(null, false)
                } else {
                    console.log('Cheque not scanned. Proceeding...');

                    const folderDate = req.body.date;
                    //const uploadPath = path.join(__dirname, 'uploads', date, scannerId, batchNo);
                    const uploadPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
                    // Ensure the folder exists
                    await fs.ensureDir(uploadPath).catch((err) => {
                        console.error('Error ensuring directory:', err);
                        return cb(new Error(`Error ensuring directory : ${err}`));
                    });

                    // Check if the folder already has 10 images
                    const files = await fs.readdir(uploadPath).catch((err) => {
                        console.log("Error in reading directory : ", err);
                        return cb(new Error(`Error in reading directory : ${err}`))
                    });

                    if (files.length === (chequCount * 4)) {
                        return cb(new Error('Folder has reached its limit of 10 images. Cannot upload more images.')); // Skip file upload
                    }

                    const folderKey = `${date}_${scannerId}_${batchNo}`;

                    if (!folderCounts[folderKey]) {
                        folderCounts[folderKey] = 0; // Start count at 0
                    }


                    if (folderCounts[folderKey] >= chequCount) {
                        //req.fileLimitExceeded = true;
                        // return cb(null, "");
                        // req.uploadError = 'Folder has reached its limit of 10 images. Cannot upload more images.';
                        return cb(new Error('Folder has reached its limit of 10 images. Cannot upload more images.')); // Skip file upload
                    }
                    name = formatfileName(date, batchNo, folderCounts[folderKey] + 1)

                    cb(null, uploadPath);



                }

            } catch (error) {
                console.log("multer disk = :", error)
                return cb(new Error('Error processing the upload destination.'));

            }


        } catch (error) {
            console.log("multer disk=", error)
            return cb(new Error('Error processing the upload destination.'));

        }

    },

    filename: async (req, file, cb) => {

        try {
            const { cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode } = req.body

            const isScann = await chequeRescanValidation_folder(cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode).catch(error => {
                console.error('Cheque validation failed:', error);
                return cb(new Error('Error during cheque validation.'));
            });

            if (isScann && isScann.success === false) {
                return cb(new Error('Cheque is already scanned'));
                //  return cb(new Error('Error generating file name.', error))
            } else {
                const timestamp = Date.now();
                const uniqueName = `${name}${file.originalname}`;
                cb(null, uniqueName);

            }


        } catch (error) {
            cb(new Error('Error generating file name.', error));
        }

    }
});



const upload = multer({ storage })

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
        console.log(error)
    }

};

router.post("/uploadChequeImage", (req, res, next) => {
    // Handle Multer upload process
    try {
        upload.array('images', 2)(req, res, async (err) => {
            if (err) {
                console.error("Multer error:", err);
                stausCode = (err.message == "Cheque is already scanned") ? 200 : 400
                return res.status(stausCode).json({
                    res_code: 0,
                    error: err.message || "Error uploading images."
                });
            }
            // next();

            try {

                const files = req.files;
                // const { date, scannerId, batchNo } = req.body;
                const uploadPath = path.join(__dirname, '..', 'CTS_uploads', req.body.date, req.body.scannerId, req.body.batchNo);

                // Convert uploaded images to TIFF format
                for (const file of files) {
                    await processMainImagewithSharp(file.path, uploadPath, file.filename);
                    console.log(`Original file saved at: ${file.filename}`);

                    const tiffPath = await convertToTiffWithSharp(uploadPath, file.filename);
                   

                    const processedPath = path.join(uploadPath, `Temp${file.filename}`);
                    
                    await processImage(tiffPath, processedPath, file.filename);
                }
                next();
            } catch (error) {
                console.error("Error processing images:", error);
                return res.status(500).json({
                    res_code: 0,
                    error: "Error processing images."
                });
            }



        });
    } catch (error) {
        console.error("Error in uploadChequeImage:", error);
        return res.status(500).json({
            res_code: 0,
            error: `Server error during upload process ; ${error}`
        });
    }
}, async (req, res) => {
    try {

        console.log("api----", req.body)
        const files = req.files;


        const { date, scannerId, userId, branchnationId, branchMicr, batchId, batchNo, chequCount, chequeSrNo, cheque_accNo, cheque_micr, cheque_chequeNo, cheque_trCode, cheque_rbiAccNo, cheque_amt, endNo } = req.body;
        const folderKey = `${date}_${scannerId}_${batchNo}`;
        // const uploadPath = path.join(__dirname, 'uploads', date, scannerId, batchNo);
        const uploadPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId, batchNo);
        const backTiff = "";
        const frontTiff = "";
        const fname = `${name}${files[0]?.originalname}`
        const frontJpeg = fname
        const transactionSlipID = 1
        const statusCode = 3;
        const isp2f = 1;
        const imagePath = uploadPath
        const chequeId = 0
        const frontUV = "";
        const iqa = "";
        const serverImagePath = uploadPath;
        const slipno = 0
        const batchuId = Number(batchId)
        const params = { batchId, branchnationId, cheque_chequeNo, cheque_rbiAccNo, cheque_trCode, cheque_amt, userId, backTiff, frontTiff, frontJpeg, transactionSlipID, cheque_micr, statusCode, imagePath, isp2f, chequeId, endNo, date, frontUV, iqa, scannerId, serverImagePath, slipno }





        if (!files || files.length < 2) {
            return res.status(200).json({
                res_code: 0,
                error: "Two images are required."
            });
        }



        folderCounts[folderKey] += 1;

        const uploadedFiles = await fs.readdir(uploadPath);

        const isScann = await chequeRescanValidation_folder(cheque_chequeNo, cheque_micr, cheque_rbiAccNo, cheque_trCode).catch(error => {
            console.error('Cheque validation failed:', error);
            return cb(new Error('Error during cheque validation.'));
        });
        console.log("is scann------>  ", isScann)

        if (isScann && isScann.success === false) {
            return res.status(200).json({
                res_code: 0,
                message: "Cheque is already scanned",

            });
        }
        console.log("folder lenth = = = ###--> ", uploadedFiles.length)
        try {

            if (uploadedFiles.length >= (chequCount * 4)) {
                try {
                    const result = await executeProcedure(params)
                    return res.status(200).json({
                        res_code: 4,
                        message: "Folder is full ",
                        RemainingChequeCount: 0,
                        data: result
                    });




                    // }
                    // const uploadPath = path.join(__dirname, 'CTS_uploads', date, scannerId, batchNo);
                    //const zipPath = path.join(__dirname, 'uploads', date, scannerId, `${batchNo}.zip`);
                    // await zipFolder(uploadPath, zipPath);


                } catch (error) {
                    console.log("folder lenght is More than cheque count : ", error)
                    return res.status(500).json({
                        res_code: 0,
                        error: `internal server error ${error}`
                    })
                }

                // Optionally, you can delete the original folder after zipping
                // await fs.remove(uploadPath);
                //const reCheque = chequCount - folderCounts[folderKey]
            }

            console.log("folder lenth _____________--> ", uploadedFiles.length, " and  ", uploadedFiles.length - 1)
            if ((uploadedFiles.length) <= (chequCount * 4)) {
                try {
                    const result = await executeProcedure(params)
                    console.log("Dataaaaa====", result)

                    if (result[0]['scannedChequeId'] === 0) {
                        return res.status(200).json({
                            res_code: 0,
                            message: "Cheque is already scanned",
                            data: result

                        });
                    }
                    else {
                        return res.status(200).json({
                            res_code: 1,
                            message: "Image and Data successfully uploaded",
                            res_forChequeNo: folderCounts[folderKey],
                            RemainingChequeCount: chequCount - folderCounts[folderKey],
                            data: result
                        });

                    }

                } catch (error) {
                    console.log("folder lenght is less than cheque count : ", error)
                    return res.status(500).json({
                        res_code: 0,
                        error: `internal server error ${error}`
                    })
                }

            }




        } catch (error) {
            console.log(error)
            return res.status(500).json({
                res_code: 0,
                error: `Server error ${error}`
            })
        }




    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({
            res_code: 0,
            error: `Server error ${err}`
        });
    }

})



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


router.post("/finalUpload", async (req, res) => {
    try {
        const { date, scannerId, batchId, batchNo, chequeCount } = req.body;

        const zipFolderPath = path.join(__dirname, '..', 'CTS_uploads', date, scannerId);  // Source folder
        const zipFileName = `${batchNo}.zip`;
        const zipFilePath = path.join(zipFolderPath, zipFileName); // Path to save zip file

        // const destinationPath = path.join('D:', 'CTS', 'images',date,scannerId); // Final destination path
        const pathFromDb = await getfolderPath()
        console.log("DatabAse Path -----:>", pathFromDb)

        const destinationPath = path.join(pathFromDb.trim(), date, scannerId); // Final destination path
        // Check if the folder exists
        if (!fs.existsSync(zipFolderPath)) {
            return res.status(400).json({
                res_code: 0,
                error: "Folder not found."
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

        return res.status(200).json({
            res_code: 1,
            message: "Folder zipped and moved successfully.",
            zipPath: finalZipPath
        });




    } catch (error) {
        console.log(error);
        return res.status(500).json({
            res_code: 0,
            error: error.message || error
        });
    }

})


module.exports = router;