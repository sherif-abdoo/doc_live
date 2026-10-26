require("dotenv").config();
const User = require('../data_link/forget_password');
const asyncwrapper = require('../middleware/asyncwrapper');
const sengGrid = require('../services/sendEmails');
const crypto = require('crypto');
const { sanitizeInput } = require('../utils/sanitize');
const logger = require('../utils/logger');

const forgetPassword = asyncwrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const email = req.body.email;

    logger.debug(`[system] Forget password request for email: ${email}`);

    const user = await User.findUserByEmail(email);
    if (!user) {
        logger.info(`[system] Email not found in database: ${email}`);
        return res.status(404).json({ status: "email not found" });
    }

    logger.debug(`[system] User found for email: ${email}, checking existing OTP`);
    const hasOTP = await User.HasOTP(email);

    if (hasOTP === true) {
        logger.info(`[system] OTP already requested for email: ${email}`);
        return res.status(400).json({ status: "You have already requested an OTP" });
    }

    const otp = generateOTP();
    logger.debug(`[system] Generated OTP for email: ${email}`);

    try {
        await sengGrid.sendOTPEmail(email, otp);
        logger.info(`[system] OTP email sent successfully to: ${email}`);
    } catch (error) {
        logger.error(`[system] Email sending failed for: ${email}, error: ${error.message}`);
        return res.status(500).json({ status: "Email service unavailable. Try again later." });
    }

    await User.addOTP(email, otp);
    logger.info(`[system] OTP saved for email: ${email}`);

    return res.json({
        status: "success",
        data: { email }
    });
});

function generateOTP() {
    return crypto.randomInt(100000, 999999);
}

module.exports = {
    forgetPassword,
};
