require("dotenv").config();
const OTP = require('../data_link/forget_password');
const Admin = require('../data_link/admin_data_link');
const Student =  require('../data_link/student_data_link');
const asyncWrapper = require('../middleware/asyncwrapper');
const { json } = require("sequelize");
const {sanitizeInput} = require('../utils/sanitize');

const otpController = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.body);
  const { otp, email } = req.body;

  // Check if OTP exists
  const found = await OTP.findOTP(email, otp);
  if (!found) {
    return res.status(400).json({
      status: "error",
      code: "OTP_INVALID",
      message: "This OTP is not valid"
    });
  }

  // Check if OTP is expired
  const expired = await OTP.expired(found.otp);
  if (expired) {
    return res.status(400).json({
      status: "error",
      code: "OTP_EXPIRED",
      message: "This OTP has expired"
    });
  }

  // Verify OTP
  await OTP.verifyOTP(email, otp);

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

  // Check if OTP is verified
  const verified = await OTP.findOTPByEmail(email);
  if (!verified || !verified.verified) {
    return res.status(400).json({
      status: "error",
      code: "OTP_NOT_VERIFIED",
      message: "OTP not verified"
    });
  }

  // Check if user is admin
  const isAdmin = await Admin.findAdminByEmail(email);
  if (isAdmin) {
    await OTP.updateAdminPassByEmail(email, password);
    await OTP.deleteOTP(email, verified.otp);

    return res.status(200).json({
      status: "success",
      code: "ADMIN_PASSWORD_UPDATED",
      message: "Admin password updated successfully"
    });
  }

  // Check if user is student
  const isStudent = await Student.findStudentByEmail(email);
  if (isStudent) {
    await OTP.updateStudentPassByEmail(email, password);
    await OTP.deleteOTP(email, verified.otp);

    return res.status(200).json({
      status: "success",
      code: "STUDENT_PASSWORD_UPDATED",
      message: "Student password updated successfully"
    });
  }

  // If user not found
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
