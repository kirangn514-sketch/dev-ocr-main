let express = require("express")
const multer = require('multer');



const router = express.Router();

const{authenticateToken} = require("../cipher/jwtToken")
const { getClearingCodes , batchCreation, batchCreationwithmssql, getAllScanDetailsWithBatchid} = require("../Controllers/batchController")
const upload = multer();



router.get("/getClearingCodes", getClearingCodes);
router.post("/createBatch", authenticateToken, batchCreation)

//router.post("/create_newBatch", authenticateToken, batchCreationwithmssql)
router.post("/create_newBatch", batchCreationwithmssql)
router.post("/getAllScanDetailsWithBatchid", getAllScanDetailsWithBatchid )

module.exports = router;
