let express = require("express")

const oracledb = require('oracledb');
const webDbConfig = require("./db/webDbConnection")
const {dbConfig} = require("./db/dbConnection")
const{authenticateToken} = require("./cipher/jwtToken")

var cors = require('cors')
let app = express()
const ExcelJS = require('exceljs');
//let connection = require("./dbConnection")
const session = require('express-session');
const bodyParser = require("body-parser")
let port = 5002;
//default port to 5002
//app.use(express.json());
app.use(express.json({limit: '250mb'}))
app.use(bodyParser.json());
app.use(cors())
//const bodyParser = require('body-parser');
//app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

app.use(
    session({
        secret: 'CTS_MOBILE', // Replace with a strong secret key
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 10 * 60 * 1000 }   // 10 min
       // cookie: { maxAge: 60 * 60 * 1000 }, // 1 hour

    })
);


app.use(bodyParser.json());


app.listen(port, () => {
    console.log(`Node Server started on port ${port}`)
})

// app.get('/api', (req, res) => {
//     try {
//         sql.open(dbConfig, (err, conn) => {
//             if (err) {
//                 console.error('Database connection failed:', err);
//                 return;
//             }
//             console.log('Connected to CTSWIN SQL Server using msnodesqlv8 : ', dbConfig);
//             res.send('server started And Connected to SQL Server using msnodesqlv8')

//         });
//     } catch (error) {
//         res.status(500).json({ error: "Database connection failed" })
//     }

// })



const otp = require("./Routes/otp")
app.use('', otp)

const ocr = require("./Routes/orcApi")
app.use('/', ocr)

const user = require("./Routes/user")
app.use('/cts', user)

const branch = require("./Routes/branch")
app.use('/cts', branch)

const batch = require("./Routes/batch")
app.use('/cts', batch)

const report = require("./Routes/report")
app.use('/cts', report)




// const uploadImage = require("./Controllers/imageUploadController")
// app.use('/cts', uploadImage)


///with Image magic
// const uploadCheque = require("./Controllers/uploadChequeImg")
// app.use('/cts', uploadCheque)


//with Sharp
// const uploadimgWithSharp = require("./Controllers/imgUploadWithSharp")
// app.use('/cts', uploadimgWithSharp)

///with Image magic
const uploadData = require("./Controllers/uploadData")
app.use('/cts', authenticateToken, uploadData)

const finalUploadZip = require("./Routes/finalUpload")
app.use('/cts', finalUploadZip)

const uploadToWeb = require("./Routes/webUpload")
app.use('/cts', uploadToWeb)

const encryptData = require("./Controllers/encryptionController")
app.use('',encryptData )

// const ciphers = require("./cipher/LoginSecure")
// app.use('/cts',ciphers )

// const javaEncrypt = require("./cipher/encryption")
// app.use('/cts',javaEncrypt )

