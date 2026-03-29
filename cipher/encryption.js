const crypto = require('crypto');
const sql = require('msnodesqlv8');
const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const dbConfig = require("../db/dbConnection")
const axios = require("axios");
const app = express();
app.use(bodyParser.json());
const session = require('express-session');



const ENCRYPTION_ALGORITHM = 'aes-256-gcm'; // AES-256 with GCM mode
const GCM_TAG_LENGTH = 16; // 16 bytes (128 bits) for GCM tag
const IV_LENGTH = 12; // 12 bytes for GCM IV
const KEY_SIZE = 32; // 32 bytes for AES-256 key

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

// Encrypt the given plaintext using the hardcoded key and IV
function encrypt(plaintext) {
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, HARDCODED_KEY, HARDCODED_IV);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([encrypted, tag]); // Append the tag to the encrypted data
}

// Decrypt the given ciphertext using the hardcoded key and IV
// function decrypt(ciphertext) {
//     const encryptedData = ciphertext.slice(0, -GCM_TAG_LENGTH);
//     const authTag = ciphertext.slice(-GCM_TAG_LENGTH);

//     const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, HARDCODED_KEY, HARDCODED_IV);
//     decipher.setAuthTag(authTag);

//     const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
//     return decrypted.toString('utf8');
// }

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
        console.error('Decryption Error:', error.message);
        throw error;
    }
}








router.post('/encrypt', (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ success: false, message: 'Missing data to encrypt' });
    }
    //const encryptedData = encrypt(data);

    const encrypted = encrypt(data);
    console.log('Encrypted (Base64):', encrypted.toString('base64'));
    res.json({ success: true,  result: encrypted.toString('base64') });
})

router.post('/decrypt', (req, res) => {
    const { data } = req.body;

    const encryptedBuffer = Buffer.from(data, 'base64');
    //const decrypted = decrypt(encryptedBuffer);
    if (!data) {
        return res.status(400).json({ success: false, message: 'Missing data to encrypt' });
    }
    const decryptedData = decrypt(encryptedBuffer);
    res.json({ success: true, decryptedData });
})


const getBranchDetails = async (bankId, branchId) => {

    if (branchId === null) {
        console.log("Branch Id is require")
    }
    else {
        const response = await axios.post(
            "http://192.168.100.183:5002/cts/getBranchById",
            { bankId, branchId }
        );


        const data = response.data;
        // console.log("API Response:", data);
        return data
    }


}





router.post("/securelogin", async (req, res) => {

    const { username, password } = req.body;

    // Check if user is already logged in
    if (req.session.username) {
        return res.status(200).json({
            res_code: 0,
            status: "error",
            message: "User already logged in",
        });
    }

    console.log("User Details:", req.body)
    // if (!isBase64(password)) {
    //     return res.status(200).json({
    //         success: false,
    //         message: 'Invalid password format. Ensure it is Base64 encoded.'
    //     });
    // }

    let decryptedPassword;
    try {
        const encryptedBuffer = Buffer.from(password, 'base64');
        decryptedPassword = decrypt(encryptedBuffer);
    } catch (err) {
        console.error('Error during decryption:', err);
        return res.status(500).json({
            success: false,
            message: 'Error during decryption.'
        });
    }



    try {
        sql.open(dbConfig, (err, conn) => {
            if (err) {
                console.error('Database connection failed:', err);
                res.status(500).json({
                    res_code: 0,
                    status: "error",
                    error: `Database connection failed ${err}`
                })
                return;
            }
            else {
                const qury = `SELECT * FROM Muser WHERE LOWER(UserName) = LOWER(?) AND LOWER(UserPassword) = LOWER(?);`
                conn.query(qury, [username, decryptedPassword], async (err, row) => {
                    conn.close((closeErr) => {
                        if (closeErr) {
                            console.error('Error closing the connection:', closeErr);
                        } else {
                            console.log('Connection closed.');
                        }
                    });
                    if (err) {
                        console.log(err)
                        return res.status(500).json({
                            res_code: 0,
                            status: "error",
                            error: `Database error ${err}`
                        })
                    }
                    //res.json(row)




                    // Check if BranchID exists
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
                        // You can decide how to handle this error; for now, we'll return it
                        // return res.status(500).json({
                        //     res_code: 0,
                        //     status: "error",
                        //     message: "Failed to fetch branch details",
                        //     error: error.message
                        // });
                    }
                    console.log("branch api details--> ", brDetails);
                    //console.log(row)
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





                    else {
                        // Set session data upon successful login
                        req.session.username = username;
                        req.session.userId = row[0].UserID;
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
                                scannerIds: brDetails?.scannerId



                            })
                    }


                })

            }

        });
    } catch (error) {
        res.status(500).json({
            res_code: 0,
            status: "error",
            error: `Database connection failed ${error}`,
        })
        console.log(error)
    }

})



router.post("/logout", (req, res) => {
    const {username} = req.body
    console.log("session user :", req.session.username)
    if (req.session.username && (req.session.username == username ) ) {
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(200).json({
                    res_code: 0,
                    status: "error",
                    message: "Failed to log out",
                });
            }

            return res.status(200).json({
                res_code: 1,
                status: "success",
                message: `User ${username} logged out successfully`,
            });
        });
    } else {
        return res.status(200).json({
            res_code: 0,
            status: "error",
            message: "No active session found for user :" + username,
        });
    }
});


module.exports = router;