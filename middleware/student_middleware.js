const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper');
const { where } = require("sequelize");
const jwt = require("jsonwebtoken");
const student = require('../data_link/student_data_link');
const admin = require('../data_link/admin_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger')


const studentFound = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { studentEmail } = req.body;
    const requester = req.admin ? `[admin : ${req.admin.email}]` : `[system]`;
    logger.debug(`${requester} Checking if email is already registered: ${studentEmail}`);
    const adFound = await admin.findAdminByEmail(studentEmail);
    if (adFound) {
        logger.info(`${requester} Email already exists as admin: ${studentEmail}`);
        const error = AppError.create("Email already exists", 400, httpStatus.Error);
        return next(error);
    }
    const stdFound = await student.findStudentByEmail(studentEmail);
    if (stdFound) {
        logger.info(`${requester} Email already exists as student: ${studentEmail}`);
        const error = AppError.create("Email already exists", 400, httpStatus.Error);
        return next(error);
    }
    logger.debug(`${requester} Email available: ${studentEmail}`);
    next();
})

const phoneNumberexists = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { studentPhoneNumber } = req.body;
    const requester = req.admin ? `[admin : ${req.admin.email}]` : `[system]`;
    if (!studentPhoneNumber) {
        logger.info(`${requester} Missing phone number`);
        return next(new AppError("Phone number is required", 400));
    }
    logger.debug(`${requester} Checking if phone number is already registered: ${studentPhoneNumber}`);
    const stdFound = await student.findStudentByPhoneNumber(studentPhoneNumber);
    if (stdFound) {
        logger.info(`${requester} Phone number already exists as student: ${studentPhoneNumber}`);
        const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
        return next(error);
    }
    const adFound = await admin.findAdminByPhoneNumber(studentPhoneNumber);
    if (adFound) {
        logger.info(`${requester} Phone number already exists as admin: ${studentPhoneNumber}`);
        const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
        return next(error);
    }
    logger.debug(`${requester} Phone number available: ${studentPhoneNumber}`);
    next();
})

const attendedSessionBefore = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { sessionId } = req.params;
    const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
    const studentId = decoded.id;
    const requester = `[student : ${studentId}]`;
    logger.debug(`${requester} Checking prior attendance for session: ${sessionId}`);
    const attendanceRecord = await student.findAttendanceByStudentAndSession(studentId, sessionId);
    if (attendanceRecord) {
        logger.info(`${requester} Student has already attended or is currently attending this session ${sessionId}`);
        const error = AppError.create("Student has already attended or is currently attending this session", 400, httpStatus.Error);
        return next(error);
    }
    logger.debug(`${requester} Student is attending session ${sessionId}`);
    next();
})

const canSeeSubmission = asyncWrapper(async (req, res, next) => {
    const sub = req.found;
    const studentId = req.student.id;
    const studentEmail = req.student.email;
    if (!studentId) {
        logger.info(`[student : ${studentEmail}] Student not found`);
        return next(new AppError("student not found", httpStatus.NOT_FOUND))
    }
    logger.debug(`[student : ${studentEmail}] Checking view permission for submission: ${sub.id}`);
    if (sub.studentId !== studentId) {
        logger.info(`[student : ${studentEmail}] View permission denied - submission studentId: ${sub.studentId}, requester studentId: ${studentId}`);
        return next(new AppError("You are not allowed to view this submission", httpStatus.FORBIDDEN));
    }
    logger.debug(`[student : ${studentEmail}] View permission granted for submission: ${sub.id}`);
    next();
})

module.exports = {
    studentFound,
    attendedSessionBefore,
    canSeeSubmission,
    phoneNumberexists,
}