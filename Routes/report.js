let express = require("express")
const multer = require('multer');



const router = express.Router();

const{authenticateToken} = require("../cipher/jwtToken")
const{getRepot, getDetailRepot, getRejectionReport, getRetRejectionReport, getNPCIStatusReport, getRejData } = require("../Controllers/reportController")
const upload = multer();



router.post("/getReport", authenticateToken, getRepot);

router.post("/getDetailReport", authenticateToken, getDetailRepot);

router.post("/getRejectionReport", authenticateToken, getRejectionReport);
router.post("/getRetRejectionReport", authenticateToken, getRetRejectionReport);

router.post("/getNPCIStatusReport", authenticateToken, getNPCIStatusReport);

router.post("/getRejectionReport_v2",authenticateToken, getRejData)
module.exports = router;
