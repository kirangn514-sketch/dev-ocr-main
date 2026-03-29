let express = require("express")
const multer = require('multer');



const router = express.Router();

const{authenticateToken} = require("../cipher/jwtToken")
const{getAllBranch, getBrachFromBarnchId, readCheque} = require("../Controllers/branchControl")
const upload = multer();



router.get("/getAllBranch", upload.none() , authenticateToken, getAllBranch);
router.post("/getBranchById", upload.none(), getBrachFromBarnchId)
router.post("/read-cheque", upload.single('file'), authenticateToken, readCheque)

module.exports = router;
