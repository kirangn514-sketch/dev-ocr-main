const fs = require('fs');
const sql = require('msnodesqlv8');
let express = require("express")
const dbConfig = require("../db/dbConnection")
const crypto = require('crypto');
const axios = require("axios");
const router = express.Router();

const key = 'CTS_MOBILE';
const dbConfigdStr = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const serverIp = dbConfigdStr.serverip;

function isBase64(str) {
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    return base64Regex.test(str) && (str.length % 4 === 0);
}

function encrypt(input, key) {
    // Ensure the key is 24 bytes long (TripleDES requires a key length of 24 bytes)
    const keyBuffer = Buffer.from(key, 'utf8');
    const adjustedKey = Buffer.concat([keyBuffer, Buffer.alloc(24 - keyBuffer.length)], 24);

    const cipher = crypto.createCipheriv('des-ede3', adjustedKey, null); // ECB mode does not require an IV
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(input, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
}



function decrypt(encryptedInput, key) {
    // Convert the key to a 24-byte buffer
    const keyBuffer = Buffer.from(key, 'utf8');
    const adjustedKey = Buffer.concat([keyBuffer, Buffer.alloc(24 - keyBuffer.length)], 24);

    // Create the decipher
    const decipher = crypto.createDecipheriv('des-ede3', adjustedKey, null); // ECB mode does not require an IV
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encryptedInput, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
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

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Example key, use your actual key

    // Check if the password is a valid Base64 string
    if (!isBase64(password)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid password format. Ensure it is Base64 encoded.'
        });
    }

    // Decrypt the stored password and compare
    let decryptedPassword;
    try {
        decryptedPassword = decrypt(password, key);
    } catch (err) {
        console.error('Error during decryption:', err);
        return res.status(500).json({
            success: false,
            message: 'Error during decryption.'
        });
    }

    // Check username and decrypted password
    if (decryptedPassword === '123' && username === 'kiran') {
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: 'your_jwt_token' // Replace with actual token generation logic
        });
    } else {
        return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    }
});

router.post('/encrypt', (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ success: false, message: 'Missing data to encrypt' });
    }
    const encryptedData = encrypt(data, key);
    res.json({ success: true, encryptedData });
})

router.post('/decrypt', (req, res) => {
    const { data } = req.body;
    if (!data) {
        return res.status(400).json({ success: false, message: 'Missing data to encrypt' });
    }
    const decryptedData = decrypt(data, key);
    res.json({ success: true, decryptedData });
})





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
    if (!isBase64(password)) {
        return res.status(200).json({
            success: false,
            message: 'Invalid password format. Ensure it is Base64 encoded.'
        });
    }

    let decryptedPassword;
    try {
        decryptedPassword = decrypt(password, key);
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
                message: "User logged out successfully",
            });
        });
    } else {
        return res.status(200).json({
            res_code: 0,
            status: "error",
            message: "No active session found",
        });
    }
});





module.exports = router;