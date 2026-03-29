// Step-by-Step Solution to Implement Encryption/Decryption APIs

// 1. Install dependencies
// Run this in your terminal:
// npm install express body-parser crypto

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const router = express.Router();

const app = express();
app.use(bodyParser.json());

// 2. Pre-shared AES Key and IV
const AES_KEY = crypto.randomBytes(32); // 256-bit AES key
const IV = crypto.randomBytes(16);     // 128-bit IV

console.log('AES Key (Base64):', AES_KEY.toString('base64'));
console.log('IV (Base64):', IV.toString('base64'));

// 3. Helper Functions

// Encrypt Function
function encrypt(data) {

    const jsonString = JSON.stringify(data);
    const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, IV);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
        encryptedData: encrypted,
        iv: IV.toString('hex'),
        authTag: authTag
    };
}

// Decrypt Function
function decrypt(encryptedData, iv, authTag) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

// 4. API Endpoints

// Encryption Endpoint
router.post('/api/encrypt', (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ success: false, message: 'Missing data to encrypt' });
    }

    try {
        const encrypted = encrypt(data);
        res.json({ success: true, encrypted });
    } catch (err) {
        console.error('Encryption error:', err);
        res.status(500).json({ success: false, message: 'Encryption failed' });
    }
});

// Decryption Endpoint
router.post('/api/decrypt', (req, res) => {
    const { encryptedData, iv, authTag } = req.body;
    if (!encryptedData || !iv || !authTag) {
        return res.status(400).json({ success: false, message: 'Missing required fields for decryption' });
    }

    try {
        const decrypted = decrypt(encryptedData, iv, authTag);
        res.json({ success: true, decrypted });
    } catch (err) {
        console.error('Decryption error:', err);
        res.status(500).json({ success: false, message: 'Decryption failed' });
    }
});



router.post('/api/loginencrypted', (req, res) => {
    const { credentials } = req.body;

    const decrypted = decrypt(encryptedData, iv, authTag);

    console.log("User Details:", req.body)


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
                conn.query(qury, [username, password], async (err, row) => {
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


                    else return res.status(200).json(
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
});


module.exports = router;