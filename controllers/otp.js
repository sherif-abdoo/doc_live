require("dotenv").config();
const OTP = require('../data_link/forget_password');
const Admin = require('../data_link/admin_data_link');
const Student = require('../data_link/student_data_link');
const asyncWrapper = require('../middleware/asyncwrapper');
const { json } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize');
const logger = require('../utils/logger');

const otpController = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.body);
  const { otp, email } = req.body;

  logger.debug(`[system] Verifying OTP for email: ${email}`);

  const found = await OTP.findOTP(email, otp);
  if (!found) {
    logger.info(`[system] OTP invalid for email: ${email}`);
    return res.status(400).json({
      status: "error",
      code: "OTP_INVALID",
      message: "This OTP is not valid"
    });
  }

  const expired = await OTP.expired(found.otp);
  if (expired) {
    logger.info(`[system] OTP expired for email: ${email}`);
    return res.status(400).json({
      status: "error",
      code: "OTP_EXPIRED",
      message: "This OTP has expired"
    });
  }

  await OTP.verifyOTP(email, otp);
  logger.info(`[system] OTP verified successfully for email: ${email}`);

  return res.status(200).json({
    status: "success",
    code: "OTP_VERIFIED",
    message: "OTP verified successfully"
  });
});


const resetPassword = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.body);
  sanitizeInput(req.params);
  const email = req.params.email;
  const password = req.body.password;

  logger.debug(`[system] Password reset attempt for email: ${email}`);

  const verified = await OTP.findOTPByEmail(email);
  if (!verified || !verified.verified) {
    logger.info(`[system] Password reset failed - OTP not verified for email: ${email}`);
    return res.status(400).json({
      status: "error",
      code: "OTP_NOT_VERIFIED",
      message: "OTP not verified"
    });
  }

  const isAdmin = await Admin.findAdminByEmail(email);
  if (isAdmin) {
    logger.debug(`[system] Resetting password for admin: ${email}`);
    await OTP.updateAdminPassByEmail(email, password);
    await OTP.deleteOTP(email, verified.otp);
    logger.info(`[system] Admin password reset successfully: ${email}`);
    return res.status(200).json({
      status: "success",
      code: "ADMIN_PASSWORD_UPDATED",
      message: "Admin password updated successfully"
    });
  }

  const isStudent = await Student.findStudentByEmail(email);
  if (isStudent) {
    logger.debug(`[system] Resetting password for student: ${email}`);
    await OTP.updateStudentPassByEmail(email, password);
    await OTP.deleteOTP(email, verified.otp);
    logger.info(`[system] Student password reset successfully: ${email}`);
    return res.status(200).json({
      status: "success",
      code: "STUDENT_PASSWORD_UPDATED",
      message: "Student password updated successfully"
    });
  }

  logger.info(`[system] Password reset failed - no user found for email: ${email}`);
  return res.status(404).json({
    status: "error",
    code: "USER_NOT_FOUND",
    message: "No admin or student found with this email"
  });
});


module.exports = {
  otpController,
  resetPassword
};
