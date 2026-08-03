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
const Topic = require('../models/topic_model.js');
const topic = require('../data_link/topic_data_link.js');
const { Op } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger')


const checkSemester = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { semester } = req.body;
    logger.debug(`[admin : ${req.admin.email}] Validating semester: ${semester}`);
    const toLow = semester.toLowerCase();
    if (toLow !== "jun" && toLow !== "nov") {
        logger.info(`[admin : ${req.admin.email}] Invalid semester: ${semester}`);
        return next(new AppError("Semester must be either 'Jun' or 'Nov'", httpStatus.BAD_REQUEST));
    }
    logger.debug(`[admin : ${req.admin.email}] Semester valid: ${semester}`);
    next();
});

const checkSubject = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { subject } = req.body;
    logger.debug(`[admin : ${req.admin.email}] Validating subject: ${subject}`);
    const toLow = subject.toLowerCase();
    if (toLow !== "biology" && toLow !== "physics" && toLow !== "chemistry") {
        logger.info(`[admin : ${req.admin.email}] Invalid subject: ${subject}`);
        return next(new AppError("Subject must be either 'Biology', 'Physics' or 'Chemistry'", httpStatus.BAD_REQUEST));
    }
    logger.debug(`[admin : ${req.admin.email}] Subject valid: ${subject}`);
    next();
});

const findTopicById = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { topicId } = req.params;
    const requester = req.admin ? `[admin : ${req.admin.email}]` : req.user ? `[user : ${req.user.email}]` : `[system]`;
    logger.debug(`${requester} Looking up topic: ${topicId}`);
    const found = await topic.getTopicById(topicId);
    if (!found) {
        logger.info(`${requester} Topic not found: ${topicId}`);
        return next(new AppError("Topic not found", httpStatus.NOT_FOUND));
    }
    req.found = found;
    logger.debug(`${requester} Topic found: ${found.id}`);
    next();
})

const canSeeTopic = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    const adminf = await admin.getAdminById(found.publisher);
    const requester = `[user : ${req.user.email}]`;
    logger.debug(`${requester} Checking view permission for topic: ${found.id}`);

    if (req.user.group !== adminf.group && req.user.group !== "all" && adminf.group !== "all") {
        logger.info(`${requester} View permission denied - user group: ${req.user.group}, publisher group: ${adminf.group}, topic: ${found.id}`);
        return next(new AppError("You do not have permission to view this topic", httpStatus.FORBIDDEN));
    }
    logger.debug(`${requester} View permission granted for topic: ${found.id}`);
    next();
});

const canUpdateTopic = asyncWrapper(async (req, res, next) => {
    const group = req.admin.group;
    const found = req.found;
    const adminf = await admin.getAdminById(found.publisher);
    logger.debug(`[admin : ${req.admin.email}] Checking update permission for topic: ${found.id}, admin group: ${group}, publisher group: ${adminf.group}`);
    if (group !== adminf.group && group !== "all") {
        logger.info(`[admin : ${req.admin.email}] Update permission denied - admin group: ${group}, publisher group: ${adminf.group}, topic: ${found.id}`);
        return next(new AppError("You do not have permission to update this topic", httpStatus.FORBIDDEN));
    }
    logger.debug(`[admin : ${req.admin.email}] Update permission granted for topic: ${found.id}`);
    next();
})

const checkData = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { semester, subject } = req.body;
    logger.debug(`[admin : ${req.admin.email}] Validating update data: semester=${semester}, subject=${subject}`);
    if (semester) {
        const toLow = semester.toLowerCase();
        if (toLow !== "jun" && toLow !== "nov") {
            logger.info(`[admin : ${req.admin.email}] Invalid semester: ${semester}`);
            return next(new AppError("Semester must be either 'Jun' or 'Nov'", httpStatus.BAD_REQUEST));
        }
    }

    if (subject) {
        const toLow = subject.toLowerCase();
        if (toLow !== "biology" && toLow !== "physics" && toLow !== "chemistry") {
            logger.info(`[admin : ${req.admin.email}] Invalid subject: ${subject}`);
            return next(new AppError("Subject must be either 'Biology', 'Physics' or 'Chemistry'", httpStatus.BAD_REQUEST));
        }
    }
    logger.debug(`[admin : ${req.admin.email}] Update data valid`);
    next();
});

module.exports = {
    checkSemester,
    checkSubject,
    findTopicById,
    canSeeTopic,
    canUpdateTopic,
    checkData
};