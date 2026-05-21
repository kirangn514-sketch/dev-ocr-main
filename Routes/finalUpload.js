let express = require("express")
const multer = require('multer');




const router = express.Router();

const{authenticateToken} = require("../cipher/jwtToken")

const{ finalUpload, finalUploadQueList} = require("../Controllers/finalUploadController")
const{getAllScanDetails} = require("../db/finalWebUpload")
const upload = multer();



//router.get("/getAllBranch", upload.none() ,getAllBranch);
router.post("/finalUpload2", authenticateToken, finalUpload)
router.get("/getAllScanDetails", getAllScanDetails )
router.post("/getFinalUploadPndingList", finalUploadQueList)

module.exports = router;     
