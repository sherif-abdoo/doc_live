const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper');
const { where } = require("sequelize");
const session = require('../data_link/session_data_link.js');
const Session = require('../models/session_model.js');
const student = require('../data_link/student_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const { getCache } = require("../utils/cache");
const { Op } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger')


const sessionFound = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { sessionId } = req.params;
    const requester = req.user ? `[user : ${req.user.email}]` : req.admin ? `[admin : ${req.admin.email}]` : `[student : ${req.student.email}]`;
    logger.debug(`${requester} Looking up session: ${sessionId}`);
    const sessFound = await session.findSessionById(sessionId);
    if (!sessFound) {
        logger.info(`${requester} Session not found: ${sessionId}`);
        return next(new AppError("Session not found", httpStatus.NOT_FOUND));
    }
    logger.debug(`${requester} Session found: ${sessionId}`);
    req.sessionData = sessFound;
    next();
});

const sessionStarted = asyncWrapper(async (req, res, next) => {
    const sessFound = req.activeSession;
    const requester = req.user ? `[user : ${req.user.email}]` : req.student ? `[student : ${req.student.email}]` : '[unknown]';
    logger.debug(`${requester} Checking if session is active`);
    if (!sessFound || !sessFound.dateAndTime) {
        logger.info(`${requester} Session not started yet`);
        return next(new AppError("Session not started yet", httpStatus.BAD_REQUEST));
    }

    const sessionStart = new Date(sessFound.dateAndTime);
    const now = new Date();
    const sessionEnd = new Date(sessionStart.getTime() + 150 * 60 * 1000);

    const sameDate =
        now.getFullYear() === sessionStart.getFullYear() &&
        now.getMonth() === sessionStart.getMonth() &&
        now.getDate() === sessionStart.getDate();

    if (!sameDate) {
        logger.info(`${requester} Session not scheduled for today`);
        return next(new AppError("Session is not scheduled for today", httpStatus.BAD_REQUEST));
    }
    if (now < sessionStart || now > sessionEnd) {
        logger.info(`${requester} Attendance window closed`);
        return next(new AppError("Attendance window closed", httpStatus.BAD_REQUEST));
    }
    logger.debug(`${requester} Session is active and within attendance window`);
    next();
});

const canAccessSession = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const userGroup = req.admin.group;
    const sessionData = req.sessionData;
    logger.debug(`[admin : ${req.admin.email}] Checking access permission for session: ${sessionData.sessionId}`);
    if (sessionData.group !== 'all' && sessionData.group !== userGroup && userGroup !== 'all') {
        logger.info(`[admin : ${req.admin.email}] Access denied - session group: ${sessionData.group}, admin group: ${userGroup}`);
        return next(new AppError("You do not have permission to access this session", httpStatus.FORBIDDEN));
    }
    logger.debug(`[admin : ${req.admin.email}] Access granted for session: ${sessionData.sessionId}`);
    next();
});

const canAccessActiveSession = asyncWrapper(async (req, res, next) => {
    const userGroup = req.student.group;
    logger.debug(`[student : ${req.student.email}] Checking for active session in group: ${userGroup}`);
    let activeSession = await getCache(`activeSession:${userGroup}`);
    if (!activeSession) {
        activeSession = await getCache("activeSession:all");
    }
    if (!activeSession) {
        logger.info(`[student : ${req.student.email}] No active session found for group: ${userGroup}`);
        return next(new AppError("No active session found for your group", httpStatus.NOT_FOUND));
    }
    logger.debug(`[student : ${req.student.email}] Active session found: ${activeSession.sessionId}`);
    req.activeSession = activeSession;
    next();
});

const activeSessionExists = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[admin : ${req.user.email}]`;
    logger.debug(`${requester} Checking for active session in group: ${userGroup}`);
    let activeSession = await session.getActiveSessionByAGroup(userGroup);
    if (!activeSession) {
        activeSession = await session.getActiveSessionByAGroup('all');
        if (!activeSession) {
            logger.info(`${requester} No active session found for group: ${userGroup}`);
            return next(new AppError("No active session found for your group", httpStatus.NOT_FOUND));
        }
    }
    logger.debug(`${requester} Active session found: ${activeSession.sessionId}`);
    req.activeSession = activeSession;
    next();
});

const upcomingSession = asyncWrapper(async (req, res, next) => {
    const { group } = req.student;
    logger.debug(`[student : ${req.student.email}] Fetching upcoming session for group: ${group}`);
    const upcomingSession = await session.findAllUpcomingSessionByGroup(group);
    if (!upcomingSession) {
        logger.info(`[student : ${req.student.email}] No upcoming session found for group: ${group}`);
        return next(new AppError("No upcoming session found for your group", httpStatus.NOT_FOUND));
    }
    logger.debug(`[student : ${req.student.email}] Upcoming session found`);
    req.upcomingSession = upcomingSession;
    next();
});

/*
const preventMultipleActiveSessions = asyncWrapper(async (req, res, next) => {
  const adminGroup = req.admin.group;
  // Check for an unfinished session within last 2.5 hours
  const AnExistingSession = await session.existingSession(adminGroup);
  if (AnExistingSession) {
    return next(
      new AppError(
        "A session is already active for this group. You cannot start another one until it finishes or expires.",
        httpStatus.BAD_REQUEST
      )
    );
  }
  next();
});
*/

module.exports = {
    sessionFound,
    sessionStarted,
    canAccessSession,
    canAccessActiveSession,
    activeSessionExists,
    upcomingSession,
    //preventMultipleActiveSessions
}