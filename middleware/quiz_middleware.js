const sequelize = require('../config/database');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const Quiz = require('../models/quiz_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const { getCache } = require("../utils/cache");
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger')

const checkFields = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { mark, date, semester, durationInMin } = req.body;
    const nmark = parseFloat(mark);
    const ndurationInMin = parseInt(durationInMin);
    logger.debug(`[admin : ${req.admin.email}] Validating quiz fields`);

    if (nmark == null || date == null || semester == null || ndurationInMin == null) {
        logger.info(`[admin : ${req.admin.email}] Missing required fields`);
        return next(new AppError("All fields are required", httpStatus.BAD_REQUEST));
    }
    if (typeof nmark !== 'number' || nmark < 0) {
        logger.info(`[admin : ${req.admin.email}] Invalid mark: ${mark}`);
        return next(new AppError("Mark must be a non-negative number", httpStatus.BAD_REQUEST));
    }
    const parsedDate = new Date(date);
    if (parsedDate.toString() === "Invalid Date") {
        logger.info(`[admin : ${req.admin.email}] Invalid date: ${date}`);
        return next(new AppError("Invalid date format", httpStatus.BAD_REQUEST));
    }
    if (typeof semester !== 'string' || semester.trim() === '') {
        logger.info(`[admin : ${req.admin.email}] Invalid semester: ${semester}`);
        return next(new AppError("Semester must be a non-empty string", httpStatus.BAD_REQUEST));
    }
    if (typeof ndurationInMin !== 'number' || ndurationInMin <= 0) {
        logger.info(`[admin : ${req.admin.email}] Invalid duration: ${durationInMin}`);
        return next(new AppError("Duration must be a positive number", httpStatus.BAD_REQUEST));
    }
    logger.debug(`[admin : ${req.admin.email}] All quiz fields valid`);
    next();
});

const getGroup = asyncWrapper(async (req, res, next) => {
    const group = req.user.group;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
    if (!group) {
        logger.info(`${requester} Group not found`);
        return next(new AppError("Group not found", httpStatus.NOT_FOUND));
    }
    req.group = group;
    logger.debug(`${requester} Group resolved: ${group}`);
    next();
});

// check topic exist

const quizExists = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { quizId } = req.params;
    const requester = req.user ? `[user : ${req.user.email}]` : req.admin ? `[admin : ${req.admin.email}]` : `[student : ${req.student.email}]`;
    logger.debug(`${requester} Looking up quiz: ${quizId}`);
    const quizData = await quiz.getQuizById(quizId);
    if (!quizData) {
        logger.info(`${requester} Quiz not found: ${quizId}`);
        return next(new AppError("Quiz not found", httpStatus.NOT_FOUND));
    }
    logger.debug(`${requester} Quiz found: ${quizId}`);
    req.quizData = quizData;
    next();
});

const canAccessQuiz = asyncWrapper(async (req, res, next) => {
    const userGroup = req.admin.group;
    const quizData = req.quizData;
    logger.debug(`[admin : ${req.admin.email}] Checking access permission for quiz: ${quizData.quizId}`);
    const publisher = await admin.findAdminById(quizData.publisher);
    if (!publisher) {
        logger.info(`[admin : ${req.admin.email}] Publisher not found for quiz: ${quizData.quizId}`);
        return next(new AppError("Publisher not found", httpStatus.NOT_FOUND));
    }
    if (publisher.group !== 'all' && publisher.group !== userGroup && userGroup !== 'all') {
        logger.info(`[admin : ${req.admin.email}] Permission denied - publisher group: ${publisher.group}, admin group: ${userGroup}`);
        return next(new AppError("You do not have permission to access this quiz", httpStatus.FORBIDDEN));
    }
    logger.debug(`[admin : ${req.admin.email}] Access permission granted for quiz: ${quizData.quizId}`);
    next();
});



const canSeeQuiz = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;
    const quizData = req.quizData;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
    logger.debug(`${requester} Checking view permission for quiz: ${quizData.quizId}`);
    const publisher = await admin.findAdminById(quizData.publisher);
    if (!publisher) {
        logger.info(`${requester} Publisher not found for quiz: ${quizData.quizId}`);
        return next(new AppError("Publisher not found", httpStatus.NOT_FOUND));
    }
    if (publisher.group !== 'all' && publisher.group !== userGroup && userGroup !== 'all') {
        logger.info(`${requester} View permission denied - publisher group: ${publisher.group}, user group: ${userGroup}`);
        return next(new AppError("You do not have permission to view this quiz", httpStatus.FORBIDDEN));
    }
    logger.debug(`${requester} View permission granted for quiz: ${quizData.quizId}`);
    next();
});

const activeQuizExists = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
    logger.debug(`${requester} Checking for active quiz in group: ${userGroup}`);
    let activeQuiz = await getCache(`activeQuiz:${userGroup}`);
    if (!activeQuiz) {
        activeQuiz = await getCache("activeQuiz:all");
    }
    if (!activeQuiz) {
        logger.info(`${requester} No active quiz found for group: ${userGroup}`);
        return next(new AppError("No active quiz found", httpStatus.NOT_FOUND));
    }
    logger.debug(`${requester} Active quiz found: ${activeQuiz.quizId}`);
    req.quizData = activeQuiz;
    next();
});

const submittedBefore = asyncWrapper(async (req, res, next) => {
    const subQuiz = req.quizData;
    const studentId = req.user.id;
    logger.debug(`[student : ${req.user.email}] Checking prior submission for quiz: ${subQuiz.quizId}`);
    const submission = await quiz.findSubmissionByQuizAndStudent(subQuiz.quizId, studentId);
    req.submitted = "false";
    if (submission) {
        req.submitted = "true";
        logger.debug(`[student : ${req.user.email}] Already submitted quiz: ${subQuiz.quizId}`);
    } else {
        logger.debug(`[student : ${req.user.email}] No prior submission for quiz: ${subQuiz.quizId}`);
    }
    next();
});

const canAccessActiveQuiz = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;
    const activeQuiz = req.quizData;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
    logger.debug(`${requester} Checking access to active quiz: ${activeQuiz.quizId}`);
    const publisher = await admin.findAdminById(activeQuiz.publisher);
    if (userGroup !== 'all' && publisher.group !== userGroup && publisher.group !== 'all') {
        logger.info(`${requester} Access denied to active quiz - publisher group: ${publisher.group}, user group: ${userGroup}`);
        return next(new AppError("You do not have permission to access this active quiz", httpStatus.FORBIDDEN));
    }
    logger.debug(`${requester} Access granted to active quiz: ${activeQuiz.quizId}`);
    next();
});

/*
const verifySubmissionPDF = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { answers } = req.body;

    // allow query params after .pdf
    const pdfRegex = /^https?:\/\/.+\.pdf(\?.*)?$/i;

    if (typeof answers !== 'string' || !pdfRegex.test(answers.trim())) {
        return next(new AppError("answers PDF must be a valid link ending with .pdf", httpStatus.BAD_REQUEST));
    }

    logger.debug("valid Pdf");
    next();
});
*/

const verifySubmissionTiming = asyncWrapper(async (req, res, next) => {
    const activeQuiz = req.quizData;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
    logger.debug(`${requester} Verifying submission timing for quiz: ${activeQuiz.quizId}`);
    let deadline = new Date(activeQuiz.date);
    deadline += activeQuiz.durationInMin * 60000;
    if (new Date() > deadline) {
        logger.info(`${requester} Submission time expired for quiz: ${activeQuiz.quizId}`);
        return next(new AppError("Quiz submission time has expired", httpStatus.BAD_REQUEST));
    }
    logger.debug(`${requester} Submission timing valid for quiz: ${activeQuiz.quizId}`);
    next();
});



module.exports = {
    checkFields,
    getGroup,
    quizExists,
    canSeeQuiz,
    canAccessQuiz,
    activeQuizExists,
    canAccessActiveQuiz,
    //verifySubmissionPDF,
    verifySubmissionTiming,
    submittedBefore
};