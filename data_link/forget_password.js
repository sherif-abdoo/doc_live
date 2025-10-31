const sequelize = require('../config/database');
const Student = require('../models/student_model');
const Admin = require('../models/admin_model');
const OTP = require('../models/otp');
const bcrypt = require('bcrypt');
const { Op } = require("sequelize");

async function findUserByEmail(Email) {

  const admin = await Admin.findOne({ where: { email: Email } });
  if (admin) {
    return admin;
  }
  
  const student = await Student.findOne({ where: { studentEmail: Email } });
  if (student) {
    return student;
  }


  return null;
}

async function HasOTP(email){ 
  const record = await OTP.findOne({ where: { email } });
  console.log(record); 
  if(!record) return false;
  return (record.expiresAt > new Date() ? true : false);
}

function getOTP(otp){ 
  return OTP.findOne({ 
    where: { otp }
  });
}

function findOTP(email,otp){ 
  return OTP.findOne({ 
    where: { email, otp } 
  });
}

function findOTPByEmail(email){
  return OTP.findOne({
    where: {
      email,
      verified: true,                // only verified OTPs
      expiresAt: { [Op.gt]: new Date() } // not expired
    },
    order: [["createdAt", "DESC"]]  // latest first
  });
}

async function expired(OTP){
  const otp = await getOTP(OTP);
  console.log(otp);
  if (new Date() > otp.expiresAt) {
    return true;
  }
  else return false;
}

async function verifyOTP(email,otp){
  await OTP.update(
  { verified: true },
  { where: { email, otp } }
  );
}

async function updateAdminPassByEmail(email,newPassword){
  const hashedPassword = await bcrypt.hash(String(newPassword), 10);
  Admin.update(
      { password: hashedPassword },
      { where: { email } }
  );
}

async function updateStudentPassByEmail(studentEmail,newPassword){
  const hashedPassword = await bcrypt.hash(String(newPassword), 10);
  Student.update(
      { password: hashedPassword },
      { where: { studentEmail } }
  );
}


async function addOTP(email,otp){
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await OTP.create({
      email,
      otp,
      expiresAt
    });
}

function deleteOTP(email){
  return OTP.destroy({
    where: {
      email
    }
  })
}

async function deleteOtpBySemester(semester) {
  return OTP.destroy({
    where: {
      email: {
        [Op.in]: sequelize.literal(`(
          SELECT "studentEmail" FROM student WHERE semester = ${sequelize.escape(semester)}
        )`)
      }
    }
  });
}

module.exports = {
  findUserByEmail,
  HasOTP,
  getOTP,
  verifyOTP,
  expired,
  updateAdminPassByEmail,
  updateStudentPassByEmail,
  addOTP,
  deleteOTP,
  findOTP,
  findOTPByEmail,
  deleteOtpBySemester
}