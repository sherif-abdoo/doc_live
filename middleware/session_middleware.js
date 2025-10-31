const sequelize = require('../config/database');
const bcrypt = require('bcrypt');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper');
const {where} = require("sequelize");
const session = require('../data_link/session_data_link.js');
const Session = require('../models/session_model.js');
const student = require('../data_link/student_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const { getCache } = require("../utils/cache");
const { Op } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize.js');

const sessionFound = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { sessionId } = req.params;

    const sessFound = await session.findSessionById(sessionId);
    if (!sessFound) {
        return next(new AppError("Session not found", httpStatus.NOT_FOUND));
    }

    console.log("Session found:", sessFound);

    req.sessionData = sessFound;

    next();
});

const sessionStarted = asyncWrapper(async (req, res, next) => {
    const sessFound = req.activeSession; // use from cache
    if (!sessFound || !sessFound.dateAndTime) {
        return next(new AppError("Session not started yet", httpStatus.BAD_REQUEST));
    }

    const sessionStart = new Date(sessFound.dateAndTime);
    const now = new Date();

    // 150 min window
    const sessionEnd = new Date(sessionStart.getTime() + 150 * 60 * 1000);

    const sameDate =
        now.getFullYear() === sessionStart.getFullYear() &&
        now.getMonth() === sessionStart.getMonth() &&
        now.getDate() === sessionStart.getDate();

    if (!sameDate) {
        return next(new AppError("Session is not scheduled for today", httpStatus.BAD_REQUEST));
    }

    if (now < sessionStart || now > sessionEnd) {
        return next(new AppError("Attendance window closed", httpStatus.BAD_REQUEST));
    }

    next();
});

const canAccessSession = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const userGroup = req.admin.group;
    const sessionData = req.sessionData;
    if (sessionData.group !== 'all' && sessionData.group !== userGroup&& userGroup !== 'all') {
        return next(new AppError("You do not have permission to access this session", httpStatus.FORBIDDEN));
    }
    console.log("User has permission to access the session");
    next();
});

const canAccessActiveSession = asyncWrapper(async (req, res, next) => {
    const userGroup = req.student.group;

    let activeSession = await getCache(`activeSession:${userGroup}`);
    if (!activeSession) {
        activeSession = await getCache("activeSession:all");
    }

    if (!activeSession) {
        return next(new AppError("No active session found for your group", httpStatus.NOT_FOUND));
    }

    console.log("Active session found:", activeSession);
    req.activeSession = activeSession;
    next();
});

const activeSessionExists = asyncWrapper(async (req, res, next) => {
    const userGroup = req.student.group;
    const activeSession = await session.getActiveSessionByAGroup(userGroup);
    if (!activeSession) {
        return next(new AppError("No active session found for your group", httpStatus.NOT_FOUND));
    }
    console.log("Active session found:", activeSession);
    req.activeSession = activeSession;
    next();
});

const upcomingSession = asyncWrapper(async (req, res, next) => {
  const { group } = req.student;

  const upcomingSession = await session.findAllUpcomingSessionByGroup(group);

  if (!upcomingSession) {
    return next(
      new AppError("No upcoming session found for your group", httpStatus.NOT_FOUND)
    );
  }
  req.upcomingSession = upcomingSession;
  next();
});

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

module.exports = {
    sessionFound,
    sessionStarted,
    canAccessSession,
    canAccessActiveSession,
    activeSessionExists,
    upcomingSession,
    preventMultipleActiveSessions
}