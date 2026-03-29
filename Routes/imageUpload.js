let express = require("express")
const multer = require('multer');



const router = express.Router();


const {upload, uploadImages } = require("../Controllers/imageUploadController")
//const upload = multer();




router.post("/uploadImage", upload.array('images', 2), uploadImages)



module.exports = router;
