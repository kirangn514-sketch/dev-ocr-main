let express = require("express")
const router = express.Router()
//const dbConfig = require("../dbConnection")
const oracledb = require('oracledb');

const dbConfig = {
    user: "PSBCKYC_LIVE",
    password: "adroit11",
    connectString: "192.168.100.121:1521/orcl19psb"

}



router.post("/otp", async (req, res) => {
    //const { date1 , date2, date3} = req.body;
    const { employeeid } = req.body;
    // let frDate = date1.split("-").reverse().join("/")
    // let toDate = date2.split("-").reverse().join("/")
   




const query2 = 
`select otp,employee_id from mobile_user_details where employee_id =:employeeid`



const queryForBoth =
``

    //console.log(date, date1, date2, date3)
    try {

        let result
        const connection = await oracledb.getConnection(dbConfig);
      //  result = await connection.execute(query2, { date1 , date2 });

       // console.log(frDate , toDate )
         //result = await connection.execute(queryForBoth, {  frDate, toDate });
         result = await connection.execute(query2, {employeeid});
        const formatDt = formatData(result.rows);
        res.json(formatDt);
        console.log(result.rows);

    } catch (error) {
        console.error("error fetching data from oracle : ", error)
        res.status(500).json({ error: "Internal server error" })
        console.error("unable to connect with oracle detabase 192.168.100.121 for otp", error)
    }

})


const formatData = (ro) => {


    return ro.map((row) => {

        //let errorCount = getError(row[1], row[2])
       // let equalRequest = equalRequestForInvalidData(row[1], row[2])
        return {

            otp: row[0],
            empid: row[1],
            
        }
    })
}




module.exports = router;





