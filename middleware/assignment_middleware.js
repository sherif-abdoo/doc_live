const sequelize = require('../config/database');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const Assignment = require('../models/assignment_model.js');
const assignment = require('../data_link/assignment_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger');

const checkField = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { mark, document, endDate, semester, topicId, title, description } = req.body;
    const nmark = Number(mark);
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Validating assignment fields`);

    if (semester == null || topicId == null || title == null) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Missing required fields`);
        return next(new AppError("All fields are required", httpStatus.BAD_REQUEST));
    }

    if (typeof nmark !== 'number' || nmark < 0) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Invalid mark: ${mark}`);
        return next(new AppError("Mark must be a non-negative number", httpStatus.BAD_REQUEST));
    }

    const pdfRegex = /^https?:\/\/.+\.pdf$/i;
    if (typeof document !== 'string' || !pdfRegex.test(document.trim())) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Invalid PDF URL: ${document}`);
        return next(new AppError("Assignment PDF must be a valid link ending with .pdf", httpStatus.BAD_REQUEST));
    }

    const parsedDate2 = new Date(endDate);
    if (parsedDate2.toString() === "Invalid Date") {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Invalid end date: ${endDate}`);
        return next(new AppError("Invalid date format", httpStatus.BAD_REQUEST));
    }

    if (parsedDate2 <= Date()) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] End date is in the past: ${endDate}`);
        return next(new AppError("End date must be after start date", httpStatus.BAD_REQUEST));
    }

    if (typeof semester !== 'string' || semester.trim() === '') {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Invalid semester: ${semester}`);
        return next(new AppError("Semester must be a non-empty string", httpStatus.BAD_REQUEST));
    }

    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] All fields valid for assignment: ${title}`);
    next();
})

const assignExists = asyncWrapper(async (req, res, next) => {
    const { assignId } = req.params;
    const requester = req.user
        ? `[user : ${req.user.email} | ${req.user.name} | ${req.user.group}]`
        : req.admin
            ? `[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}]`
            : `[student : ${req.student.email} | ${req.student.name} | ${req.student.group}]`;
    logger.debug(`${requester} Looking up assignment: ${assignId}`);
    const assignData = await assignment.getAssignmentById(assignId);
    if (!assignData) {
        logger.info(`${requester} Assignment not found: ${assignId}`);
        return next(new AppError("Assignment not found", httpStatus.NOT_FOUND));
    }
    logger.debug(`${requester} Assignment found: ${assignId}`);
    req.assignData = assignData;
    next();
});

const canSeeAssign = asyncWrapper(async (req, res, next) => {
    let userGroup;
    let requester;
    if (req.user) {
        userGroup = req.user.group;
        requester = `[user : ${req.user.email} | ${req.user.name} | ${req.user.group}]`;
    } else if (req.admin) {
        userGroup = req.admin.group;
        requester = `[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}]`;
    } else if (req.student) {
        userGroup = req.student.group;
        requester = `[student : ${req.student.email} | ${req.student.name} | ${req.student.group}]`;
    }

    const assignData = req.assignData;
    logger.debug(`${requester} Checking view permission for assignment: ${assignData.assignId}`);
    const publisher = await admin.findAdminById(assignData.publisher);
    if (!publisher) {
        logger.info(`${requester} Publisher not found for assignment: ${assignData.assignId}`);
        return next(new AppError("Publisher not found", httpStatus.NOT_FOUND));
    }
    if (publisher.group !== 'all' && publisher.group !== userGroup && userGroup !== 'all') {
        logger.info(`${requester} Permission denied - publisher group: ${publisher.group}, user group: ${userGroup}`);
        return next(new AppError("You do not have permission to view this Assignment", httpStatus.FORBIDDEN));
    }
    logger.debug(`${requester} View permission granted for assignment: ${assignData.assignId}`);
    next();
});

const submittedBefore = asyncWrapper(async (req, res, next) => {
    const assId = req.params.assignId;
    const studentId = req.student.id;
    logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Checking prior submission for assignment: ${assId}`);
    const submission = await assignment.findSubmissionByAssignmentAndStudent(assId, studentId);
    req.submitted = "false";
    if (submission) {
        req.submitted = "true";
        logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Already submitted assignment: ${assId}`);
    } else {
        logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] No prior submission for assignment: ${assId}`);
    }
    next();
})

const authorisedToModify = asyncWrapper(async (req, res, next) => {
    const userGroup = req.admin.group;
    const assignData = req.assignData;
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Checking modify permission for assignment: ${assignData.assignId}`);
    const publisher = await admin.findAdminById(assignData.publisher);
    if (!publisher) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Publisher not found for assignment: ${assignData.assignId}`);
        return next(new AppError("Publisher not found", httpStatus.NOT_FOUND));
    }
    if (publisher.group !== 'all' && publisher.group !== userGroup && userGroup !== 'all') {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Modify permission denied - publisher group: ${publisher.group}, admin group: ${userGroup}`);
        return next(new AppError("You do not have permission to modify/delete this Assignment", httpStatus.FORBIDDEN));
    }
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Modify permission granted for assignment: ${assignData.assignId}`);
    next();
});


module.exports = {
    checkField,
    assignExists,
    canSeeAssign,
    submittedBefore,
    authorisedToModify
}
