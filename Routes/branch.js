let express = require("express")
const multer = require('multer');



const router = express.Router();

const{authenticateToken} = require("../cipher/jwtToken")
const{getAllBranch, getBrachFromBarnchId} = require("../Controllers/branchControl")
const upload = multer();



router.get("/getAllBranch", upload.none() , authenticateToken, getAllBranch);
router.post("/getBranchById", upload.none(), getBrachFromBarnchId)

module.exports = router;
