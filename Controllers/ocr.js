let express = require("express");
const router = express.Router();
const axios = require("axios");
var cors = require('cors')
let app = express()
let bodyParser = require("body-parser")
app.use(express.json());
const logger = require("../logging/logger")
// app.use(bodyParser.json());
// app.use(cors())
// app.use(bodyParser.json({ limit: '200mb' }));
// app.use(bodyParser.urlencoded({ limit: '200mb', extended: true, parameterLimit:50000 }));



// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

exports.ocrApi = async (req, res) => {
    const { task_id, images } = req.body;

    console.log("Request body----  ", req.body)
    console.log("task_id----", task_id)
    console.log("images---", images)

    try {
        const response = await axios.post(
            "https://mrlc37rxo6.execute-api.ap-south-1.amazonaws.com/prod",
            { task_id, images },
            {
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        const data = response.data;
        console.log("API Response data---:", data.body);

        if (data.body && data.body.res.success) {
            const extractionData = data.body.res.data;
            let result = {};
            console.log("extractionData_Updated -->", extractionData)
            extractionData.forEach(item => {
                if (item.success) {
                    item.data.forEach(idData => {
                        const accountData = idData.data.data;
                        console.log("idata---", idData)
                        if (accountData.ACCOUNT_NUMBER.value !== "") {
                            { result.ACCOUNT_NUMBER = accountData.ACCOUNT_NUMBER.value }

                            // result.ACCOUNT_NUMBER = {
                            //     value: accountData.ACCOUNT_NUMBER.value,
                            //     //confidence: accountData.ACCOUNT_NUMBER.confidence
                            // };
                        }
                        if (accountData.CHEQUE_NUMBER.value !== "") {
                            { result.CHEQUE_NUMBER = accountData.CHEQUE_NUMBER.value }
                            // result.CHEQUE_NUMBER = {
                            //     value: accountData.CHEQUE_NUMBER.value,
                            //     //confidence: accountData.CHEQUE_NUMBER.confidence
                            // };
                        }
                        if (accountData.MICR_CODE.value !== "") {
                            { result.MICR_CODE = accountData.MICR_CODE.value }
                            // result.MICR_CODE = {
                            //     value: accountData.MICR_CODE.value,
                            //     //confidence: accountData.MICR_CODE.confidence
                            // };
                        }
                        if (accountData.TRANSCATION_CODE.value !== "") {
                            { result.TRANSCATION_CODE = accountData.TRANSCATION_CODE.value }
                            // result.TRANSCATION_CODE = {
                            //     value: accountData.TRANSCATION_CODE.value,
                            //     //confidence: accountData.TRANSCATION_CODE.confidence
                            // };
                        }
                        if (accountData.RBI_AC_NO.value !== "") {
                            { result.RBI_AC_NO = accountData.RBI_AC_NO.value }
                            // result.RBI_AC_NO = {
                            //     value: accountData.RBI_AC_NO.value,
                            //     //confidence: accountData.RBI_AC_NO.confidence
                            // };
                        }
                        if (accountData.IFSC.value !== "") {
                            { result.IFSC = accountData.IFSC.value }
                            // result.RBI_AC_NO = {
                            //     value: accountData.RBI_AC_NO.value,
                            //     //confidence: accountData.RBI_AC_NO.confidence
                            // };
                        }
                        if (accountData.SIGNATORY_1.value !== "") {
                            { result.SIGNATORY_1 = accountData.SIGNATORY_1.value }
                            // result.RBI_AC_NO = {
                            //     value: accountData.RBI_AC_NO.value,
                            //     //confidence: accountData.RBI_AC_NO.confidence
                            // };
                        }
                        if (accountData.SIGNATORY_2.value !== "") {
                            { result.SIGNATORY_2 = accountData.SIGNATORY_2.value }
                            // result.RBI_AC_NO = {
                            //     value: accountData.RBI_AC_NO.value,
                            //     //confidence: accountData.RBI_AC_NO.confidence
                            // };
                        }
                        if (idData.data.cheque_gray_image) {
                            // { result.IMG_URL = `data:image/jpeg;base64,${idData.data.cheque}` }
                            { result.IMG_URL = idData.data.cheque_gray_image }
                        }
                        if (idData.data.cheque_binary_image) {
                            // { result.IMG_URL = `data:image/jpeg;base64,${idData.data.cheque}` }
                            { result.IMG_URL_UV = idData.data.cheque_binary_image }
                        }
                    });
                }
            });

            console.log("Extracted Object:", result);
            logger.info("OCR API fetched successfully")
            res.status(200).json({
                message: "OCR API fetched successfully",
                data: result
            });
        } else {
            logger.error("OCR API response was not successful")
            res.status(400).json({
                message: "OCR API response was not successful",
                data: data.body
            });
        }
    } catch (error) {
        logger.error("Error to fetch OCR API : ", error)
        res.status(500).json({
            message: "Unable to fetch OCR API",
            error: error.message
        });

        console.log("Error to fetch OCR API :", error)
    }
}


exports.ocrbackApi = async (req, res) => {
    const { task_id, image_b64 } = req.body

    //task_id : cheque_back_side
    const tkd = "cheque_back_side"

    try {
        const response = await axios.post(
            "https://mrlc37rxo6.execute-api.ap-south-1.amazonaws.com/prod",
            { task_id, image_b64 }
        );

        const data = response.data;
        console.log("API Response:", data.body);

        if (data.body && data.body.res.success) {
            const extractionData = data.body.res.data;
            let result = {};
            console.log("extractionData_Back-->", extractionData)
            result.res_code = 1
            result.message = "image fetch successfully"
            result.backimage = `data:image/jpeg;base64,${extractionData.updated_image}`

            console.log("Extracted Object back:", result);
            logger.info("OCR Back fetched successfully")

            res.status(200).json({
                res_code: 1,
                message: "Back image fetch successfully",
                //  backimage_url :`data:image/jpeg;base64,${extractionData.updated_image}`
                backimage_url: extractionData.gray_image,
                backimage_url_uv: extractionData.binary_image

            });
        } else {
            logger.error("OCR API response was not successful")
            res.status(400).json({
                res_code: 0,
                status: "error",
                message: "OCR API response was not successful",
                data: data.body

            });
        }
    } catch (error) {
        logger.error(error)
        res.status(500).json({
            message: "Unable to fetch OCR API",
            error: error.message
        });

        console.log("Error to fetch OCR API : ", error)
    }



}