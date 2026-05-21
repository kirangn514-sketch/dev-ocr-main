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

// 📚 Serve Documentation Files
app.use('/docs', express.static(__dirname));

// 📄 Serve Swagger JSON specifically
app.get('/docs/swagger.json', (req, res) => {
    res.sendFile(__dirname + '/swagger.json');
});

// 📖 Official Swagger UI
// Simple proxy to fetch Swagger UI assets from CDN and serve them from same origin.
const https = require('https');
app.get('/docs/swagger-ui/*', (req, res) => {
    const cdnBase = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@3';
    const assetPath = req.path.replace('/docs/swagger-ui', '');
    const targetUrl = cdnBase + assetPath;
    https.get(targetUrl, (cdnRes) => {
        // Forward status and headers (content-type especially)
        res.statusCode = cdnRes.statusCode || 200;
        const contentType = cdnRes.headers['content-type'];
        if (contentType) res.setHeader('Content-Type', contentType);
        cdnRes.pipe(res);
    }).on('error', (err) => {
        console.error('Error proxying Swagger asset:', err);
        res.status(502).send('Failed to fetch asset');
    });
});

app.get('/docs/swagger-official', (req, res) => {
    // Serve the official UI HTML which now loads assets from /docs/swagger-ui/* (same origin)
    res.sendFile(__dirname + '/swagger-ui-official.html');
});

// Redirect /swagger to official swagger
app.get('/swagger', (req, res) => {
    res.redirect('/docs/swagger-official');
});

// 🏠 Documentation Landing Page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>CTS OCR API - Home</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
                .container { max-width: 800px; margin: 0 auto; text-align: center; color: white; }
                h1 { font-size: 40px; margin-bottom: 30px; }
                .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 30px; }
                .card { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 30px; border-radius: 10px; text-decoration: none; color: white; transition: all 0.3s ease; border: 1px solid rgba(255,255,255,0.2); }
                .card:hover { background: rgba(255,255,255,0.2); transform: translateY(-5px); }
                .card h2 { margin-top: 0; }
                .card p { margin-bottom: 15px; font-size: 14px; opacity: 0.9; }
                .btn { background: white; color: #667eea; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold; display: inline-block; }
                .btn:hover { background: #ddd; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>CTS OCR API</h1>
                <p style="font-size: 18px;">Cheque Truncation System - Optical Character Recognition</p>
                
                <div class="cards">
                    <div class="card">
                        <h2>📖 Swagger UI (Official)</h2>
                        <p>Official Swagger documentation - Test API endpoints directly</p>
                        <a href="/docs/swagger-official" class="btn">Open →</a>
                    </div>
                    <div class="card">
                        <h2>📖 API Documentation</h2>
                        <p>Interactive Swagger UI with endpoint explorer and try-it-out functionality</p>
                        <a href="/docs/swagger-ui.html" class="btn">Open →</a>
                    </div>
                    <div class="card">
                        <h2>📊 Status Dashboard</h2>
                        <p>Visual analytics and endpoint status overview with security issues</p>
                        <a href="/docs/api-dashboard.html" class="btn">Open →</a>
                    </div>
                    <div class="card">
                        <h2>📋 Documentation</h2>
                        <p>Detailed endpoint reference and API guide in Markdown format</p>
                        <a href="/docs/API_DOCUMENTATION.md" class="btn">Open →</a>
                    </div>
                    <div class="card">
                        <h2>⚡ Quick Reference</h2>
                        <p>Quick lookup table for all endpoints with status and auth info</p>
                        <a href="/docs/ENDPOINT_STATUS.md" class="btn">Open →</a>
                    </div>
                </div>
                
                <div style="margin-top: 50px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);">
                    <h3>🚀 Quick Start</h3>
                    <p style="font-size: 14px;">
                        Start exploring your API endpoints using the interactive Swagger UI.<br>
                        All 27 endpoints are documented with examples and descriptions.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Node Server started on port ${port}`)
    console.log(`📚 API Documentation available at: http://localhost:${port}/docs/swagger-ui.html`)
    console.log(`📊 Dashboard available at: http://localhost:${port}/docs/api-dashboard.html`)
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

const zipBatchRouter = require('./Routes/zipBatch');
app.use('/cts', zipBatchRouter)




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

