const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const Regection = require('../models/rejection_model.js');
const regection = require('../data_link/admin_data_link');
const bcrypt = require('bcrypt');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper.js');
const { where } = require("sequelize");
const jwt = require("jsonwebtoken");
const { addClient } = require('../utils/sseClients');
const student = require('../data_link/student_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const logger = require('../utils/logger');

const adminFound = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;
  logger.debug(`[admin : ${email}] Checking if email already exists`);
  const adFound = await admin.findAdminByEmail(email);
  if (adFound) {
    logger.info(`[admin : ${email}] Email already exists in admin table`);
    const error = AppError.create("Email already exists", 400, httpStatus.Error);
    return next(error);
  }
  const stdFound = await student.findStudentByEmail(email);
  if (stdFound) {
    logger.info(`[admin : ${email}] Email already exists in student table`);
    const error = AppError.create("Email already exists", 400, httpStatus.Error);
    return next(error);
  }
  logger.debug(`[admin : ${email}] Email is available`);
  next();
})

const studentFound = asyncWrapper(async (req, res, next) => {
  const { studentEmail } = req.params;
  logger.debug(`[admin : ${req.admin.email}] Looking up student: ${studentEmail}`);
  const found = await student.findStudentByEmail(studentEmail);
  if (!found) {
    logger.info(`[admin : ${req.admin.email}] Student not found: ${studentEmail}`);
    return next(new AppError('student not found', 404));
  }
  if (found.group !== req.admin.group) {
    logger.info(`[admin : ${req.admin.email}] Unauthorized access to student: ${studentEmail}, student group: ${found.group}`);
    return next(new AppError('You are not allowed to access this student', 403));
  }
  if (found.verified) {
    logger.info(`[admin : ${req.admin.email}] Student already verified: ${studentEmail}`);
    return next(new AppError('Student already verified', 400));
  }
  req.student = found;
  logger.debug(`[admin : ${req.admin.email}] Student found: ${studentEmail}`);
  next();
});

const passwordEncryption = asyncWrapper(async (req, res, next) => {
  logger.debug(`[admin : ${req.body.email || 'unknown'}] Encrypting password`);
  const { password } = req.body;
  const encryptedPassword = await bcrypt.hash(String(password), 10);
  req.body.password = encryptedPassword;
  next();
});

const checkAuthurity = asyncWrapper(async (req, res, next) => {
  const { studentEmail } = req.params;
  logger.debug(`[admin : ${req.admin.email}] Checking authority over student: ${studentEmail}`);
  const found = await student.findStudentByEmail(studentEmail);
  if (!found) {
    logger.info(`[admin : ${req.admin.email}] Student not found: ${studentEmail}`);
    return next(new AppError('student not found', 404));
  }
  if (String(found.assistantId) !== String(req.admin.id) && req.admin.id !== 1) {
    logger.info(`[admin : ${req.admin.email}] Unauthorized - student assistantId: ${found.assistantId}, admin id: ${req.admin.id}`);
    return next(new AppError('You are not allowed to access this student', 403));
  }
  req.student = found;
  logger.debug(`[admin : ${req.admin.email}] Authority confirmed for student: ${studentEmail}`);
  next();
});

const adminPhoneNumberExists = asyncWrapper(async (req, res, next) => {
  const { phoneNumber } = req.body;
  logger.debug(`[admin : ${req.body.email || 'unknown'}] Checking if phone number exists: ${phoneNumber}`);
  const adFound = await admin.findAdminByPhoneNumber(phoneNumber);
  if (adFound) {
    logger.info(`[admin : ${req.body.email || 'unknown'}] Phone number already exists in admin table`);
    const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
    return next(error);
  }
  const stdFound = await student.findStudentByPhoneNumber(phoneNumber);
  if (stdFound) {
    logger.info(`[admin : ${req.body.email || 'unknown'}] Phone number already exists in student table`);
    const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
    return next(error);
  }
  logger.debug(`[admin : ${req.body.email || 'unknown'}] Phone number is available`);
  next();
});

const checkAuthurityByID = asyncWrapper(async (req, res, next) => {
  const { studentId } = req.params;
  logger.debug(`[admin : ${req.admin.email}] Checking authority over studentId: ${studentId}`);
  const found = await student.findStudentById(studentId);
  if (!found) {
    logger.info(`[admin : ${req.admin.email}] Student not found, id: ${studentId}`);
    return next(new AppError('student not found', 404));
  }
  if (String(found.assistantId) !== String(req.admin.id) && req.admin.id !== 1) {
    logger.info(`[admin : ${req.admin.email}] Unauthorized - student assistantId: ${found.assistantId}, admin id: ${req.admin.id}`);
    return next(new AppError('You are not allowed to access this student', 403));
  }
  req.student = found;
  req.student.id = studentId;
  logger.debug(`[admin : ${req.admin.email}] Authority confirmed for studentId: ${studentId}`);
  next();
});

const canReject = asyncWrapper(async (req, res, next) => {
  const { studentEmail } = req.params;
  const adminId = req.admin.id;
  logger.debug(`[admin : ${req.admin.email}] Checking if can reject student: ${studentEmail}`);
  const reg = await regection.findByEmailAndId(studentEmail, adminId);
  if (reg) {
    logger.info(`[admin : ${req.admin.email}] Already rejected student: ${studentEmail}`);
    return next(new AppError('Can not reject student twice', 404));
  }
  logger.debug(`[admin : ${req.admin.email}] Can reject check passed for student: ${studentEmail}`);
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