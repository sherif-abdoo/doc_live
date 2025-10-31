const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const Regection = require('../models/rejection_model.js');
const regection = require('../data_link/admin_data_link');
const bcrypt = require('bcrypt');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper.js');
const {where} = require("sequelize");
const jwt = require("jsonwebtoken");
const { addClient } = require('../utils/sseClients');
const student = require('../data_link/student_data_link.js');
const admin = require('../data_link/admin_data_link.js');

const adminFound= asyncWrapper(async (req, res, next) => {
    const { email } = req.body;
    const adFound = await admin.findAdminByEmail(email);
    if (adFound) {
        const error = AppError.create("Email already exists", 400, httpStatus.Error);
        return next(error);
    }
    const stdFound = await student.findStudentByEmail(email);
    if (stdFound) {
        const error = AppError.create("Email already exists", 400, httpStatus.Error);
        return next(error);
    }

    next();
})

const studentFound = asyncWrapper(async (req, res, next) => {
    const { studentEmail } = req.params;
    const found = await student.findStudentByEmail(studentEmail);
    if (!found) {
    return next(new AppError('student not found', 404));
  }
  if(found.group !== req.admin.group) {
    return next(new AppError('You are not allowed to access this student', 403));
  }
  if (found.verified) {
    return next(new AppError('Student already verified', 400));
  }
  req.student = found;
  console.log("student found : ", studentEmail) // attach found admin for later use
  next();
});

const passwordEncryption = asyncWrapper( async (req,res,next) => {
    const { password } = req.body;
    const encryptedPassword = await bcrypt.hash(String(password),10);
    req.body.password = encryptedPassword;
    next();
});

const checkAuthurity = asyncWrapper(async (req, res, next) => {
    const admin = req.admin; // must be set earlier by findAndCheckAdmin
   const { studentEmail } = req.params;
    const found = await student.findStudentByEmail(studentEmail);
    if (!found) {
    return next(new AppError('student not found', 404));
  }
  if(String(found.assistantId) !== String(req.admin.id) && req.admin.id !== 1) {
    console.log("found.assistantId : ", found.assistantId)
    console.log("req.admin.id : ", req.admin.id)
    return next(new AppError('You are not allowed to access this student', 403));
  }
  req.student = found;
  console.log("student found : ", studentEmail)
    next();
});

const adminPhoneNumberExists = asyncWrapper(async (req, res, next) => {
    const { phoneNumber } = req.body;
    const adFound = await admin.findAdminByPhoneNumber(phoneNumber);
    if (adFound) {
        const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
        return next(error);
    }
    const stdFound = await student.findStudentByPhoneNumber(phoneNumber);
    console.log("stdFound : ", stdFound)
    if (stdFound) {
        const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
        return next(error);
    }
    next();
} );

const checkAuthurityByID = asyncWrapper(async (req, res, next) => {
    const admin = req.admin; // must be set earlier by findAndCheckAdmin
   const { studentId } = req.params;
    const found = await student.findStudentById(studentId);
    if (!found) {
    return next(new AppError('student not found', 404));
  }
  if(String(found.assistantId) !== String(req.admin.id) && req.admin.id !== 1) {
    console.log("found.assistantId : ", found.assistantId)
    console.log("req.admin.id : ", req.admin.id)
    return next(new AppError('You are not allowed to access this student', 403));
  }
  req.student = found;
  req.student.id = studentId;
  console.log("student found : ", studentId)
    next();
});

const canReject = asyncWrapper(async (req, res, next) => {
  const {studentEmail }= req.params
  const adminId= req.admin.id;
  console.log("email and adminId : ", studentEmail, adminId)
  const reg = await regection.findByEmailAndId(studentEmail,adminId);
  console.log("reg : ", reg)
  if (reg) {
    return next(new AppError('Can not reject student twice', 404));
    return next(error)
  }
  console.log("canReject chack done ")
  next();
});



module.exports = {
    adminFound,
    passwordEncryption,
    studentFound,
    checkAuthurity,
    checkAuthurityByID,
    canReject,
    adminPhoneNumberExists
}