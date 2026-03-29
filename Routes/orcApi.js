const express = require("express");
const router = express.Router();
const axios = require("axios");
//const multer = require('multer');
const{authenticateToken} = require("../cipher/jwtToken")

let app = express()
// const bodyParser = require('body-parser');
// app.use(bodyParser.json({ limit: '800mb' }));
// app.use(bodyParser.urlencoded({ limit: '800mb', extended: true }));
app.use((req, res, next) => {
    console.log("Middleware initialized");
    console.log(`Request size: ${req.headers['content-length'] || 0} bytes`)
    next();
});

const rawBodyMiddleware = (req, res, next) => {
    req.rawBody = '';
    req.on('data', (chunk) => {
        req.rawBody += chunk;
    });
    req.on('end', () => {
        console.log(`Raw payload size: ${Buffer.byteLength(req.rawBody)} bytes`);
        next();
    });
};

app.use(rawBodyMiddleware);

app.use((req, res, next) => {
    console.log(`Request size: ${req.headers['content-length'] || 0} bytes`);
    next();
});


const {ocrApi, ocrbackApi} =require("../Controllers/ocr")


router.post("/ocrApi", authenticateToken, ocrApi);
router.post("/ocrBack", authenticateToken, ocrbackApi);

module.exports = router;
