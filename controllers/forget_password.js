require("dotenv").config();
const User = require('../data_link/forget_password');
const asyncwrapper = require('../middleware/asyncwrapper');
const sengGrid = require('../services/sendgird');
const crypto = require('crypto');
const {sanitizeInput} = require('../utils/sanitize');

const forgetPassword = asyncwrapper(async (req, res, next) => {
    sanitizeInput(req.body);

    // get the email from the user
    const email = req.body.email;

    // Check the email if it's in the data base or not 
    const user = await User.findUserByEmail(email);
    if (user){

        // Check if this email has requested an otp or not
        const hasOTP = await User.HasOTP(email);
        console.log(hasOTP);
        if(hasOTP===true){
            res.json({
                status: "You have already requested an OTP",
            })
        }
        else {
            // in this case email is in the data base and it didn't request an otp
            const otp = generateOTP();// generate otp
            sengGrid.sendOTPEmail(email,otp);// send email with the otp
            User.addOTP(email,otp);
            res.json({
                status: "success",
                data: {
                    email: email
                }
            });
        }
    }
    res.json({
        status:"email not found",
    })
});

function generateOTP(){
    return crypto.randomInt(100000, 999999); // 6 digits
}

module.exports = {
    forgetPassword,
}