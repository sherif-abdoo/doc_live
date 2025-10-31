const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper');
const {where} = require("sequelize");
const jwt = require("jsonwebtoken");
const student = require('../data_link/student_data_link');
const admin = require('../data_link/admin_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');

const studentFound= asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const {studentEmail } = req.body;
    const adFound = await admin.findAdminByEmail(studentEmail);
    if (adFound) {
        const error = AppError.create("Email already exists", 400, httpStatus.Error);
        return next(error);
    }
    const stdFound = await student.findStudentByEmail(studentEmail);
    if (stdFound) {
        const error = AppError.create("Email already exists", 400, httpStatus.Error);
        return next(error);
    }
    next();
})

const phoneNumberexists = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { studentPhoneNumber } = req.body;
    if(!studentPhoneNumber){
        return next(new AppError("Phone number is required", 400));
    }
    const stdFound = await student.findStudentByPhoneNumber(studentPhoneNumber);
    if (stdFound) {
        const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
        return next(error);
    }
    const adFound = await admin.findAdminByPhoneNumber(studentPhoneNumber);
    if (adFound) {
        const error = AppError.create("Phone number already exists", 400, httpStatus.Error);
        return next(error);
    }
    next();
})

const attendedSessionBefore = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { sessionId } = req.params;
    const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
    const studentId = decoded.id;  
    console.log("Nope");
    const attendanceRecord = await student.findAttendanceByStudentAndSession(studentId, sessionId);
    console.log("Yes");
    if (attendanceRecord) {
        const error = AppError.create("Student has already attended or is currently attending this session", 400, httpStatus.Error);
        return next(error);
    }
    next();
})

const canSeeSubmission = asyncWrapper(async (req,res, next) => {
    const sub = req.found;
    const studentId = req.student.id;
    if(!studentId){
        return next(new AppError("student not found", httpStatus.NOT_FOUND))
    }
    console.log("StudentId: ",studentId);
    if(sub.studentId !== studentId ){
        return next(new AppError("You are not allowed to view this submission", httpStatus.FORBIDDEN));
    }
    next();
})

module.exports = {   
    studentFound,
    attendedSessionBefore,
    canSeeSubmission,
    phoneNumberexists,
}