let express = require("express")
const multer = require('multer');

const router = express.Router();

const {uploadOutwardBatchToWeb} = require("../Web_DB/uploadToWeb")




router.post("/uploadOutwardBatchToWeb" ,uploadOutwardBatchToWeb);

module.exports = router;
