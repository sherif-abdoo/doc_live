const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper.js');
const admin = require('../data_link/admin_data_link.js');
const Submission = require('../models/submission_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const assignment = require('../data_link/assignment_data_link.js');
const student = require('../data_link/student_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger.js');

const subExist = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const subId = req.params.id;
    const requester = req.admin ? `[admin : ${req.admin.email}]` : req.student ? `[student : ${req.student.email}]` : `[system]`;
    logger.debug(`${requester} Looking up submission: ${subId}`);
    const found = await admin.findSubmissionById(subId)
    if (!found) {
        logger.info(`${requester} Submission not found: ${subId}`);
        return next(new AppError("Submission demanded is not found", httpStatus.NOT_FOUND));
    }
    logger.debug(`${requester} Submission found: ${found.id}`);
    req.found = found;
    next();
})

const canSeeSubmission = asyncWrapper(async (req, res, next) => {
    const sub = req.found;
    logger.debug(`[admin : ${req.admin.email}] Checking view permission for submission: ${sub.id}`);
    const subAdmin = await admin.findAdminById(sub.assistantId)
    const adminId = req.admin.id;
    const subStudent = await student.findStudentById(sub.studentId);
    if (!adminId) {
        logger.info(`[admin : ${req.admin.email}] Admin not found`);
        return next(new AppError("Admin not found", httpStatus.NOT_FOUND))
    }
    logger.debug(`[admin : ${req.admin.email}] AdminId: ${adminId}, subAdmin group: ${subAdmin.group}, admin group: ${req.admin.group}, subStudent group: ${subStudent.group}`);
    if (sub.assistantId !== adminId && adminId !== 1 && subAdmin.group !== req.admin.group && subStudent.group !== req.admin.group) {
        logger.info(`[admin : ${req.admin.email}] View permission denied - submission: ${sub.id}, submission assistantId: ${sub.assistantId}, adminId: ${adminId}, subAdmin group: ${subAdmin.group}, subStudent group: ${subStudent.group}, admin group: ${req.admin.group}`);
        return next(new AppError("You are not allowed to view this submission", httpStatus.FORBIDDEN));
    }
    logger.debug(`[admin : ${req.admin.email}] View permission granted for submission: ${sub.id}`);
    next();
})

const marked = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    logger.debug(`[admin : ${req.admin.email}] Checking if submission is marked: ${found.id}`);
    if (found.marked) {
        logger.info(`[admin : ${req.admin.email}] Submission already marked: ${found.id}`);
        return next(new AppError("Submission already marked", httpStatus.FORBIDDEN));
    }
    logger.debug(`[admin : ${req.admin.email}] Submission is not marked: ${found.id}`);
    next();
})

const subMarked = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    const requester = req.admin ? `[admin : ${req.admin.email}]` : req.student ? `[student : ${req.student.email}]` : `[system]`;
    logger.debug(`${requester} Checking if submission is marked: ${found.id}`);
    if (!found.marked) {
        logger.info(`${requester} Submission not marked yet: ${found.id}`);
        return next(new AppError("Submission not marked yet", httpStatus.BAD_REQUEST));
    }
    logger.debug(`${requester} Submission is marked: ${found.id}`);
    next();
})


const checkData = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { marked, score } = req.body
    const found = req.found;
    logger.debug(`[admin : ${req.admin.email}] Validating mark data for submission: ${found.id}`);
    /* if (req.found.score) {
         logger.debug(`[admin : ${req.admin.email}] Not first mark for submission: ${found.id}`);
         next();
         return;
     }*/
    const nscore = Number(score); // Convert score to a number
    /*if (!marked || !score) {
        logger.info(`[admin : ${req.admin.email}] Missing required fields for submission: ${found.id}`);
        return next(new AppError("All fields are required", httpStatus.BAD_REQUEST));
    }*/
    let total;
    if (found.type === "quiz") {
        const qfound = await quiz.getQuizById(found.quizId);
        total = qfound.mark
    }
    else {
        const afound = await assignment.getAssignmentById(found.assId);
        total = afound.mark
    }
    logger.debug(`[admin : ${req.admin.email}] All fields checked for submission: ${found.id}, total: ${total}`);

    /*const pdfRegex = /^https?:\/\/.+\.pdf$/i;
    if (typeof marked !== 'string' || !pdfRegex.test(marked.trim())) {
        logger.info(`[admin : ${req.admin.email}] Invalid marked PDF link for submission: ${found.id}`);
        return next(new AppError("marked PDF must be a valid link ending with .pdf", httpStatus.BAD_REQUEST));
    }
    logger.debug(`[admin : ${req.admin.email}] Marked PDF link valid for submission: ${found.id}`)
*/
    if (typeof nscore !== 'number' || nscore <= 0 || nscore > total) {
        logger.info(`[admin : ${req.admin.email}] Invalid score: ${score} (total: ${total}) for submission: ${found.id}`);
        return next(new AppError("Score must be a positive number and less than the total score", httpStatus.BAD_REQUEST));
    }
    logger.debug(`[admin : ${req.admin.email}] Score valid for submission: ${found.id}`)

    next();
})



module.exports = {
    subExist,
    canSeeSubmission,
    marked,
    checkData,
    subMarked
}