const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper.js');
const admin = require('../data_link/admin_data_link.js');
const Submission = require('../models/submission_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const assignment = require('../data_link/assignment_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger.js');

const subExist = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const subId = req.params.id;
    const found = await admin.findSubmissionById(subId)
    if (!found) {
        logger.debug("Submission not found : ", subId);
        return next(new AppError("Submission demanded is not found", httpStatus.NOT_FOUND));
    }
    logger.debug("Submission found : ", found);
    req.found = found;
    next();
})

const canSeeSubmission = asyncWrapper(async (req, res, next) => {
    const sub = req.found;
    const subAdmin = await admin.findAdminById(sub.assistantId)
    const adminId = req.admin.id;
    if (!adminId) {
        logger.debug("admin not found : ", adminId)
        return next(new AppError("Admin not found", httpStatus.NOT_FOUND))
    }
    logger.debug("AdminId: ", adminId);
    logger.debug("group: ", subAdmin.group, "   admin: ", req.admin.group)
    if (sub.assistantId !== adminId && adminId !== 1 && subAdmin.group !== req.admin.group) {
        logger.debug("No access to the submission: ", sub.id, " by admin: ", adminId)
        return next(new AppError("You are not allowed to view this submission", httpStatus.FORBIDDEN));
    }
    next();
})

const marked = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    if (found.marked) {
        return next(new AppError("Submission already marked", httpStatus.FORBIDDEN));
    }
    next();
})

const subMarked = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    if (!found.marked) {
        return next(new AppError("Submission not marked yet", httpStatus.BAD_REQUEST));
    }
    next();
})


const checkData = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { marked, score } = req.body
    if (req.found.score) {
        logger.debug("not first mark");
        next();
        return;
    }
    const nscore = Number(score); // Convert score to a number
    if (!marked || !score) {
        return next(new AppError("All fields are required", httpStatus.BAD_REQUEST));
    }
    const found = req.found;
    let total;
    if (found.type === "quiz") {
        const qfound = await quiz.getQuizById(found.quizId);
        total = qfound.mark
    }
    else {
        const afound = await assignment.getAssignmentById(found.assId);
        total = afound.mark
    }
    logger.debug("All fields checked");

    const pdfRegex = /^https?:\/\/.+\.pdf$/i;
    if (typeof marked !== 'string' || !pdfRegex.test(marked.trim())) {
        return next(new AppError("marked PDF must be a valid link ending with .pdf", httpStatus.BAD_REQUEST));
    }
    logger.debug("chack 2 done, pdf valid")

    if (typeof nscore !== 'number' || nscore <= 0 || nscore > total) {
        return next(new AppError("Score must be a positive number and less than the total score", httpStatus.BAD_REQUEST));
    }
    logger.debug("chack 3 done, duration valid")

    next();
})



module.exports = {
    subExist,
    canSeeSubmission,
    marked,
    checkData,
    subMarked
}