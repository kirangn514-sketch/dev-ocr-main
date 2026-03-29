
const crypto = require('crypto');
const sql = require('mssql');
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const { dbConfig, serverIp } = require("../db/dbConnection")
const axios = require("axios");
const app = express();
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');
const session = require('express-session');
const logger = require("../logging/logger")
const { generateJwtToken, decodetoken, removeTokenFromActiveSet } = require("../cipher/jwtToken")

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'; // AES-256 with GCM mode
const GCM_TAG_LENGTH = 16; // 16 bytes (128 bits) for GCM tag
const IV_LENGTH = 12; // 12 bytes for GCM IV
const KEY_SIZE = 32; // 32 bytes for AES-256 key
//const JWT_SECRET_KEY = "Q1RTX01PQklMRQ=="  //Decode with base 64
// Set to store active tokens for JWT authentication
//const activeTokens = new Set();


// Hardcoded IV (12 bytes for GCM)
const HARDCODED_IV = Buffer.from([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C
]);

// Hardcoded Key (32 bytes for AES-256)
const HARDCODED_KEY = Buffer.from([
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10,
    0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
    0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20
]);







function encrypt(plaintext) {
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, HARDCODED_KEY, HARDCODED_IV);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([encrypted, tag]); // Append the tag to the encrypted data
}

function decrypt(ciphertext) {
    console.log('Ciphertext:', ciphertext.toString('hex'));
    const encryptedData = ciphertext.slice(0, -GCM_TAG_LENGTH);
    const authTag = ciphertext.slice(-GCM_TAG_LENGTH);

    console.log('Encrypted Data:', encryptedData.toString('hex'));
    console.log('Auth Tag:', authTag.toString('hex'));

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, HARDCODED_KEY, HARDCODED_IV);
    decipher.setAuthTag(authTag);

    try {
        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        logger.error(error)
        console.error('Decryption Error:', error.message);
        throw error;
    }
}


exports.encryptPass = (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ success: false, message: 'Missing data to encrypt' });
    }
    //const encryptedData = encrypt(data);

    const encrypted = encrypt(data);
    console.log('Encrypted (Base64):', encrypted.toString('base64'));
    res.json({ success: true, result: encrypted.toString('base64') });
}

exports.decryptpass = (req, res) => {
    const { data } = req.body;
    try {
        const encryptedBuffer = Buffer.from(data, 'base64');
        //const decrypted = decrypt(encryptedBuffer);
        if (!data) {
            return res.status(400).json({ success: false, message: 'Missing data to encrypt' });
        }
        const decryptedData = decrypt(encryptedBuffer);
        res.json({ success: true, decryptedData });
    } catch (error) {
        logger.error(error)
        return res.status(500).json({ success: false, message: "Invalid data unable to decrypt" })
    }

}


const getBranchDetails = async (bankId, branchId) => {

    if (branchId === null) {
        console.log("Branch Id is require")
    }
    else {
        const response = await axios.post(
            `http://${serverIp}:5002/cts/getBranchById`,
            { bankId, branchId }
        );


        const data = response.data;
        // console.log("API Response:", data);
        return data
    }


}

// exports.loginUser = async (req, res) => {

//     const { username, password } = req.body;

//     console.log("User Details:", req.body)


//     try {
//         sql.open(dbConfig, (err, conn) => {
//             if (err) {
//                 console.error('Database connection failed:', err);
//                 res.status(500).json({
//                     res_code: 0,
//                     status: "error",
//                     error: `Database connection failed ${err}`
//                 })
//                 return;
//             }
//             else {
//                 const qury = `SELECT * FROM Muser WHERE LOWER(UserName) = LOWER(?) AND LOWER(UserPassword) = LOWER(?);`
//                 conn.query(qury, [username, password], async (err, row) => {
//                     conn.close((closeErr) => {
//                         if (closeErr) {
//                             console.error('Error closing the connection:', closeErr);
//                         } else {
//                             console.log('Connection closed.');
//                         }
//                     });
//                     if (err) {
//                         console.log(err)
//                         return res.status(500).json({
//                             res_code: 0,
//                             status: "error",
//                             error: `Database error ${err}`
//                         })
//                     }
//                     //res.json(row)




//                     // Check if BranchID exists
//                     const branchId = row[0]?.BranchID;

//                     console.log("BranchId", branchId, "Data: ", row)
//                     const msgWithBranchId = "User authenticated successfully"
//                     const msgWithoutBranchId = "Brach not assigned to Logged in user"
//                     let brDetails = null;
//                     try {
//                         if (!branchId) {
//                             brDetails = {}
//                         }
//                         else {
//                             brDetails = await getBranchDetails(3, branchId);
//                             console.log("branch api details--> ", brDetails);
//                         }

//                     } catch (error) {
//                         console.error("Error fetching branch details:", error);
//                         // You can decide how to handle this error; for now, we'll return it
//                         // return res.status(500).json({
//                         //     res_code: 0,
//                         //     status: "error",
//                         //     message: "Failed to fetch branch details",
//                         //     error: error.message
//                         // });
//                     }
//                     console.log("branch api details--> ", brDetails);
//                     //console.log(row)
//                     if (!username || !password) return res.status(200).json({
//                         res_code: 0,
//                         status: "error",
//                         message: "Username and password are required"
//                     })

//                     if (row.length === 0) return res.status(200).json({
//                         res_code: 0,
//                         status: "error",
//                         message: "Invalid Credentials"
//                     })
//                     if (row[0].UserActive == 0) return res.status(200).json({
//                         res_code: 2,
//                         status: "error",
//                         message: "User is deactivated"
//                     })


//                     else return res.status(200).json(
//                         {
//                             res_code: row[0].BranchID ? 1 : 4,
//                             status: "success",
//                             message: row[0].BranchID ? msgWithBranchId : msgWithoutBranchId,
//                             userId: row[0].UserID,
//                             userName: row[0].UserName,
//                             loginId: row[0].LoginID,
//                             branchId: row[0].BranchID,
//                             branchDetails: brDetails?.branchDetails ? brDetails?.branchDetails : [],
//                             scannerIds: brDetails?.scannerId



//                         })
//                 })

//             }

//         });
//     } catch (error) {
//         res.status(500).json({
//             res_code: 0,
//             status: "error",
//             error: `Database connection failed ${error}`,
//         })
//         console.log(error)
//     }

// }



exports.loginUser = async (req, res) => {

    const { username, password } = req.body;

    if (req.session.username) {
        return res.status(200).json({
            res_code: 0,
            status: "error",
            message: "User already logged in",
        });
    }

    console.log("User Details:", req.body)

    let decryptedPassword;
    try {
        const encryptedBuffer = Buffer.from(password, 'base64');
        decryptedPassword = decrypt(encryptedBuffer);
    } catch (err) {
        logger.error(err)
        console.error('Error during decryption:', err);
        return res.status(500).json({
            success: false,
            message: 'Error during decryption.'
        });
    }

    try {
        const token = generateJwtToken(username)

        const pool = await sql.connect(dbConfig);
        const qury = `SELECT * FROM Muser WHERE LOWER(UserName) = LOWER(@username) AND LOWER(UserPassword) = LOWER(@password);`
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, decryptedPassword)
            .query(qury);
        await pool.close();

        const row = result.recordset;

        const branchId = row[0]?.BranchID;

        console.log("BranchId", branchId, "Data: ", row)
        const msgWithBranchId = "User authenticated successfully"
        const msgWithoutBranchId = "Brach not assigned to Logged in user"
        let brDetails = null;
        try {
            if (!branchId) {
                brDetails = {}
            }
            else {
                brDetails = await getBranchDetails(3, branchId);
                console.log("branch api details--> ", brDetails);
            }

        } catch (error) {
            console.error("Error fetching branch details:", error);
            logger.error(error)
        }
        console.log("branch api details--> ", brDetails);
        
        if (!username || !password) return res.status(200).json({
            res_code: 0,
            status: "error",
            message: "Username and password are required"
        })

        if (row.length === 0) return res.status(200).json({
            res_code: 0,
            status: "error",
            message: "Invalid Credentials"
        })
        if (row[0].UserActive == 0) return res.status(200).json({
            res_code: 2,
            status: "error",
            message: "User is deactivated"
        })

        logger.info(`User ${username} logged in successfuly`)
        return res.status(200).json(
            {
                res_code: row[0].BranchID ? 1 : 4,
                status: "success",
                message: row[0].BranchID ? msgWithBranchId : msgWithoutBranchId,
                userId: row[0].UserID,
                userName: row[0].UserName,
                loginId: row[0].LoginID,
                branchId: row[0].BranchID,
                branchDetails: brDetails?.branchDetails ? brDetails?.branchDetails : [],
                scannerIds: brDetails?.scannerId,
                token: token
            })

    } catch (error) {
        logger.error(error)
        res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database connection failed ${error}`,
        })
        console.log(error)
        logger.error("Error during login user:", error)
    }

}
exports.logoutUser = async (req, res) => {
    const { username } = req.body

    const token = req.headers['authorization']?.split(' ')[1];
    // const token = req.headers['authorization']
    // const tokenWithSign = 
    console.log("JWT TOken : ", token)
    // const decode =  decodetoken(req.headers['authorization'])
    // console.log("Decoded JWT : ", decode)

    try {
        if (!token) {
            return res.status(200).send({
                res_code: 0,
                status: "error",
                message: 'Token not provided!'
            });
        }
        if (token) {
            const result = removeTokenFromActiveSet(token)
            const decode = decodetoken(token)
            console.log("Decoded JWT : ", decode)

            if (result.status === true) {
                logger.info(`User ${username} log out successfuly`)
                return res.status(200).send({
                    res_code: 1,
                    status: "Success",
                    message: username + result.msg
                });
            }
            if (result.status === false) {
                return res.status(200).send({
                    res_code: 0,
                    status: "Error",
                    message: result.msg
                });
            }


        }
    } catch (error) {
        console.log(error)
        logger.error(error)
        return res.status(500).send({
            res_code: 0,
            status: "error",
            message: 'Error occurred while logging out!'
        });
    }




}



