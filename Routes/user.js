let express = require("express")



const router = express.Router();


const { authenticateToken } = require("../cipher/jwtToken")

const { loginUser, logoutUser, encryptPass, decryptpass } = require("../Controllers/userControl")




router.post("/loginUser", loginUser);
router.post("/logoutUser", authenticateToken, logoutUser);
router.post("/encrypt", encryptPass);
router.post("/decrypt", decryptpass);

module.exports = router;
