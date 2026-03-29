
const jwt = require('jsonwebtoken');

const JWT_SECRET_KEY = "Q1RTX01PQklMRQ=="


// Set to store active tokens for JWT authentication
const activeTokens = new Set();

const generateJwtToken = (username) => {
    const token = jwt.sign({ username }, JWT_SECRET_KEY, { expiresIn: '500 min' });

    activeTokens.add(token);

    console.log("Active Tokens :", activeTokens)

    return token;

}

const removeTokenFromActiveSet = (token) => {
    {
       // const token = req.headers['authorization']?.split(' ')[1];
        let msg
        if (token && activeTokens.has(token)) {
            activeTokens.delete(token);
            console.log("Current Active Tokens :", activeTokens)

            return { status: true, msg: " Logout successfully" }
        }
        if (!activeTokens.has(token)) {
            return { status: false, msg: " Token is invalid or logged out!" }
        }
    }

}


const decodetoken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        console.log(decoded);


        return decoded

    } catch (error) {
        console.error("Invalid token:", error.message);
    }
}




function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access Denied. Token is required.' });
    }

    jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }

        // Attach the decoded username to req.user
        req.user = user; // user contains { username: 'john_doe', iat, exp }
        next();
    });
}


const isUserLoggedIn =()=>{

}


module.exports = { generateJwtToken, removeTokenFromActiveSet, decodetoken, authenticateToken }