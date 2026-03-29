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
const { exec } = require('child_process');
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



async function calculateThreshold(imagePath) {
    try {
        // Read image data as raw pixel data
        const { data, info } = await sharp(imagePath)
            .ensureAlpha() // Ensure there is an alpha channel
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Calculate average pixel intensity (grayscale)
        let total = 0;
        for (let i = 0; i < data.length; i += info.channels) {
            total += data[i]; // Only use the first channel (assumes grayscale or RGB)
        }

        const averageIntensity = total / (data.length / info.channels);
        console.log(`Calculated Threshold (average intensity): ${averageIntensity}`);
        return Math.round(averageIntensity);
    } catch (error) {
        console.error("Error calculating threshold:", error);
        throw error;
    }
}

async function calculateThreshold(imagePath) {
    try {
        // Read raw image data
        const { data, info } = await sharp(imagePath)
            .ensureAlpha() // Ensures alpha channel if missing
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Total number of pixels
        const totalPixels = info.width * info.height;

        // Sum intensity of the first channel (assuming grayscale or RGB)
        let totalIntensity = 0;
        for (let i = 0; i < data.length; i += info.channels) {
            totalIntensity += data[i]; // Only use the first channel
        }

        // Calculate the average intensity
        const averageIntensity = totalIntensity / totalPixels;

        console.log(`Calculated Threshold (average intensity): ${averageIntensity}`);
        return Math.round(averageIntensity); // Return rounded value
    } catch (error) {
        console.error("Error calculating threshold:", error);
        throw error;
    }
}





// Helper function to calculate average brightness of the image
// async function getImageBrightness(imagePath) {
//     const { data, info } = await sharp(imagePath)
//         .greyscale()
//         .raw()
//         .toBuffer({ resolveWithObject: true });

//     const totalPixels = info.width * info.height;
//     const totalBrightness = data.reduce((sum, value) => sum + value, 0);
//     const averageBrightness = totalBrightness / totalPixels / 255;

//     return { brightness: averageBrightness };
// }
// Function to convert JPEG to TIFF
// Function to convert images to TIFF format and save them in the same folder
// async function convertToTiff(uploadPath, filename) {
//     try {
//         const inputFilePath = path.join(uploadPath, filename);
//         const outputFilePath = path.join(uploadPath, filename.replace(path.extname(filename), '.tif'));

//         // Analyze brightness to check if the image is too dark or too light
//         const { brightness } = await getImageBrightness(inputFilePath);

//         // Analyze the brightness of the input image
//         const calculatedThreshold = await calculateThreshold(inputFilePath);

//         // Map calculated threshold to the 3–39% range (8–99 in 0–255 scale)
//         const thresholdValue = Math.min(Math.max(calculatedThreshold, 8), 99);

//         let brightnessValue = 1;  // Default
//         if (brightness < 0.4) {
//             brightnessValue = 1.2;  // Increase brightness for "Too Dark" images
//         } else if (brightness > 0.6) {
//             brightnessValue = 0.8;  // Decrease brightness for "Too Light" images
//         }

//         // Use sharp to convert the image to TIFF lzw
//         await sharp(inputFilePath)
//             .resize(1594, 728)
//             // .greyscale()

//             .sharpen({ sigma: 2.5 })
//             .median(1)

//             .toColourspace('b-w')
//             .modulate({
//                  //brightness: 1,
//                 contrast: 2
//             })
//             .blur(1.3)
//             //.threshold(thresholdValue)
//             .threshold(thresholdValue)
//             .tiff({
//                 // compression: 'ccittfax4',
//                 // bitdepth: 1,
//                 xres: 7.87,
//                 yres: 7.87,

//                 bitdepth: 1,
//                 compression: 'ccittfax4',
//                 predictor: 'none',
//                 // density: 400



//             })
//             // .withMetadata({ density: 160 })

//             .toFile(outputFilePath);

//         console.log(`Converted ${filename} to TIFF format.`);
//         await calculateThreshold(outputFilePath)
//         return outputFilePath;
//     } catch (error) {
//         console.error(`Error converting ${filename} to TIFF:`, error);
//         console.error(`Error converting ${filename} to TIFF:`, error.message, error.stack);
//         throw error;
//     }
// }


async function convertToTiffWithMagic(uploadPath, filename) {
    try {
        const inputFilePath = path.join(uploadPath, filename);
        // const outputFilePath = path.join(uploadPath, filename.replace(path.extname(filename), '.tiff'));

        const outputFilePath = path.join(path.dirname(uploadPath), `${path.basename(filename, path.extname(filename))}.tif`);


        // Analyze brightness and threshold
        // const { brightness } = await getImageBrightness(inputFilePath);
        // const calculatedThreshold = await calculateThreshold(inputFilePath);

        // Map threshold value to 3–39% range (8–99 in 0–255 scale)
        // const thresholdValue = Math.min(Math.max(calculatedThreshold, 8), 99);

        // console.log(`Brightness: ${brightness}`);
        // console.log(`Calculated Threshold: ${calculatedThreshold}`);
        // console.log(`Mapped Threshold Value: ${thresholdValue}`);

        // // Convert threshold value to percentage
        // const thresholdPercentage = ((thresholdValue / 255) * 100).toFixed(2);
        // console.log(`Threshold Percentage: ${thresholdPercentage}%`);

        // Build the ImageMagick command
        // const command = `magick "${inputFilePath}" -resize 1594x728 -sharpen 2.5 -median 1 -blur 1.3 -threshold ${thresholdPercentage}% -compress Fax -depth 1 -density 200 "${outputFilePath}"`;
        // const command = `magick "${inputFilePath}" -resize 1800x825 -despeckle -despeckle -threshold ${39}% -compress Fax -depth 1 -density 200 "${outputFilePath}"`;

        //const command = `magick "${uploadPath}" -resize 1200x550  -despeckle  -threshold ${39}% -compress Fax -depth 1 -density 200 "${outputFilePath}"`;
       
        //const command = `magick "${uploadPath}" -resize 1200x550 -crop 1200x550+0+0  -gamma 0.9 -despeckle -threshold 39% -compress Fax -depth 1 -density 200 "${outputFilePath}"`
        // const command = `magick "${uploadPath}" -resize 1800x825^ -gravity center -extent 1800x825  -gamma 0.7 -despeckle -threshold 39% -compress Fax -depth 1 -density 200 "${outputFilePath}"`
        //Original:---
        // const command = `magick "${uploadPath}"   -threshold 39% -compress Fax -depth 1 -density 200 "${outputFilePath}"`
        //-background white -flatten  -compress Group4   -depth 8 -compress LZW 

          const command = `magick "${uploadPath}" -threshold 60% -compress Group4 -density 200 "${outputFilePath}"`
 

        // Execute the ImageMagick command
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
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
        console.error(`Error converting ${filename} to TIFF:`, error.message);
        throw error;
    }
}




// const processMainImage = async (filePath, filename) => {
//     try {
//         // Define a temporary path for the processed image
//         const tempPath = path.join(path.dirname(filePath), `temp_${path.basename(filePath)}`);
//         //  const outputFilePath = path.join(tempPath, path.basename(filename, path.extname(filename)) + '.jpg');

//         // Process the image and save to the temporary path
//         await sharp(filePath)
//             .resize(2400, 1092)
//             .sharpen({ sigma: 1.5 })
//             .modulate({
//                 contrast: 2.9
//             })
//             .grayscale() // Resize while keeping the aspect ratio
//             .jpeg({
//                 //quality: 120,      // Set high quality for JPEG

//                 // yres: 75,
//                 // compression: 'ccittfax4',
//                 // bitdepth: 8,
//                 //  predictor: 'none',
//                 density: 600
//             })
//             .withMetadata({ density: 300 })
//             .toFile(tempPath); // Save processed image to temporary path

//         const outputFilePath = filePath; // Output will overwrite the original file
//         exec(`magick ${tempPath} -colorspace Gray -depth 8 -density 100 ${outputFilePath}`, (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`ImageMagick Error: ${error.message}`);
//                 return;
//             }
//             if (stderr) {
//                 console.error(`ImageMagick Stderr: ${stderr}`);
//                 return;
//             }
//             console.log(`Processed image saved at: ${outputFilePath}`);
//             // Clean up the temporary file
//             fs.promises.unlink(tempPath);
//         });

//         // Replace the original file with the processed image
//        // await fs.promises.rename(tempPath, filePath); // Overwrite original with temp file
//         console.log(`Processed image saved at: ${filePath}`);
//     } catch (error) {
//         console.error('Error in processing image:', error);
//         throw new Error('Image processing failed.');
//     }
// };






const processMainImage = async (filePath, filename) => {
    try {
        // Define the output path
        const outputFilePath = path.join(path.dirname(filePath), `${path.basename(filename, path.extname(filename))}.jpg`);

        // ImageMagick command to resize, sharpen, adjust contrast, set grayscale, and save as JPEG
        // const command = `magick "${filePath}" -resize 1800x825 -sharpen 0x1.5 -brightness-contrast 10x4 -contrast-stretch 2%x2% -colorspace Gray -density 300 -units PixelsPerInch "${outputFilePath}"`;

        //Decrese size :
        //const command = `magick "${filePath}" -resize 1200x550 -sharpen 0x1.5 -brightness-contrast 10x2 -contrast-stretch 2%x2% -colorspace Gray -density 300 -units PixelsPerInch -quality 60 "${outputFilePath}"`;



        // const command = `magick "${filePath}" -resize 1200x550 -sharpen 0x1.5 -brightness-contrast 10x2 -contrast-stretch 2%x2% -gamma 1.2 -colorspace Gray -density 300 -units PixelsPerInch  -quality 60 "${outputFilePath}"`;

        //const command = `magick "${filePath}" -resize 1024x476 -crop 1800x825+0+0 -gamma 0.9  -brightness-contrast 8x3 -contrast-stretch 2%x2%  -colorspace Gray -density 300 -units PixelsPerInch -quality 80 "${outputFilePath}"`


        //original:----

       // const command = `magick "${filePath}" -resize 2320x1092 -sharpen 0x1.5 -gamma 0.7  -brightness-contrast 8x3 -contrast-stretch 2%x2%  -colorspace Gray -density 300 -units PixelsPerInch -quality 90 "${outputFilePath}"`
        //-strip -fuzz 20% -trim +repage 
        //-sharpen 1x1  -gamma 0.5 -brightness-contrast 8x2 
        const command = `magick "${filePath}"  -resize 2320x1092  -gamma 0.7 -density 300 -units PixelsPerInch -quality 90 "${outputFilePath}"`
        
        // Execute the command
        await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
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
            console.log("is scann------> 0 ", isScann)



            try {

                if (isScann && isScann.success === false) {
                    console.log("is scann------> 1 ", isScann)
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

                    if (files.length === (chequCount * 6)) {
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

                console.log("file.originalname", file.originalname)
                //const outputFileName =  file.originalname.replace(path.extname(filename), '.jpg');
                const timestamp = Date.now();
                const nm = file.originalname.split('.')[0] + ".jpg"
                console.log("file.originalname------", nm)
                const uniqueName = `${name}${nm}`;
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
                stausCode = ((err.message === "Cheque is already scanned") ) ? 200 : 400
                req.files = null;
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
        console.log("Date------", date)
        const backTiff = "";
        const frontTiff = "";
        const fname = `${name}${files[0]?.originalname}`
        const frontJpeg = fname
        const transactionSlipID = 1
        const statusCode = 3;
        const isp2f = 1;
        //const imagePath = uploadPath
        const chequeId = 0
        const frontUV = "";
        const iqa = "";
       // const serverImagePath = uploadPath;
       const modified_date = date.split("-").join("")
       const serverImagePath = 'D:\\Arpan Patre\\Publish\\RBL\\RBL Patches\\UAT\\08112023_1\\Outward\\Images\\'+modified_date+"\\"+scannerId+"\\"+batchNo+"\\"
        const slipno = 0
        const batchuId = Number(batchId)
        const imagePath = serverImagePath
        // const validCheque_amt = cheque_amt?cheque_amt: 100
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
                message: "Cheque is already scanned_3",

            });
        }
        console.log("folder lenth = = = ###--> ", uploadedFiles.length)
        try {

            if (uploadedFiles.length >= (chequCount * 6)) {
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
            if ((uploadedFiles.length) <= (chequCount * 6)) {
                try {
                    const result = await executeProcedure(params)
                    console.log("Dataaaaa====", result)

                    if (result[0]['scannedChequeId'] === 0) {
                        return res.status(200).json({
                            res_code: 0,
                            message: "Cheque is already scanned_4",
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