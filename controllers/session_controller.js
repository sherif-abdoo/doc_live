const sequelize = require('../config/database');
const Student = require('../models/student_model.js');
const student = require('../data_link/student_data_link');
const admin = require('../data_link/admin_data_link.js');
const Admin = require('../models/admin_model.js');
const session = require('../data_link/session_data_link.js');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const { getCache } = require("../utils/cache");
const { setCache } = require("../utils/cache");
const { deleteCache } = require("../utils/cache");
const { clearCache } = require("../utils/cache");
const jwt = require("jsonwebtoken");
const sse = require('../utils/sseClients.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const topicDl = require('../data_link/topic_data_link.js');
const logger = require('../utils/logger');

const startSession = asyncWrapper(async (req, res, next) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    sanitizeInput(req.body);
    const { topicId } = req.body;
    const adminId = req.admin.id;
    const sgroup = req.admin.group;
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Admin group: ${sgroup}`);

    const adminName = req.admin.name;
    const today = new Date();
    const dayName = days[today.getDay()];

    const alreadyLive = await session.getActiveSessionByAGroup(sgroup);
    if (alreadyLive) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Session already live for group: ${sgroup}`);
        return next(new AppError("A session is already live for your group", httpStatus.BAD_REQUEST));
    }

    let currTopic;
    if (topicId !== undefined && topicId !== null && topicId !== '') {
        currTopic = await topicDl.getTopicById(topicId);
        if (!currTopic) {
            logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Topic not found: ${topicId}`);
            return next(new AppError("Topic not found", httpStatus.NOT_FOUND));
        }
        if (currTopic.group !== sgroup && sgroup !== 'all' && currTopic.group !== 'all') {
            logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Topic ${topicId} belongs to group ${currTopic.group}`);
            return next(new AppError("You do not have permission to use this topic", httpStatus.FORBIDDEN));
        }
    } else {
        currTopic = await topicDl.getStudentLastTopic(sgroup);
    }

    if (!currTopic) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] No topic available for group: ${sgroup}`);
        return next(new AppError("Create a topic before starting a session", httpStatus.BAD_REQUEST));
    }
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Current topic: ${currTopic.topicId} - ${currTopic.topicName}`);

    const newSession = await admin.createSession(currTopic.topicId, sgroup, currTopic.semester, today, dayName);
    const key = `activeSession:${sgroup}`;
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Setting cache with key: ${key}`);
    setCache(key, newSession, 60 * 60 * 24);
    sse.notifyStudents(sgroup, {
        event: "session_update",
        message: `Group ${sgroup}, a date for the upcoming session has been dropped by ${adminName}. Please check your dashboard.`,
        post: {
            dateAndTime: today,
            topic: currTopic.title,
        },
    });
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Session created successfully for group: ${sgroup}, sessionId: ${newSession.sessionId}`);
    return res.status(201).json({
        status: "success",
        message: "Session created successfully",
        data: {
            id: newSession.sessionId,
            topicId: newSession.topicId,
            group: newSession.group,
            semester: newSession.semester,
            dateAndTime: newSession.dateAndTime,
            day: newSession.day
        }
    })
});

const endSession = asyncWrapper(async (req, res, next) => {
    const adminGroup = req.admin.group;
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Ending session for group: ${adminGroup}`);
    const currSession = await session.getActiveSessionByAGroup(adminGroup);
    if (!currSession) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] No active session found for group: ${adminGroup}`);
        return next(new AppError("No active session found for your group", httpStatus.NOT_FOUND));
    }
    currSession.finished = true;
    await currSession.save();
    deleteCache(`activeSession:${adminGroup}`);
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Session ${currSession.sessionId} ended for group: ${adminGroup}`);
    return res.status(200).json({
        status: "success",
        data: { message: "Session ended successfully" }
    });
})

const attendSession = asyncWrapper(async (req, res, next) => {
    const stud = req.user;
    const currSession = req.activeSession;
    const requester = stud.type === 'student'
        ? `[student : ${req.user.email} | ${req.user.name} | ${req.user.group}]`
        : `[admin : ${req.user.email} | ${req.user.name} | ${req.user.group}]`;
    logger.debug(`${requester} Attempting to attend session: ${currSession.sessionId}`);

    if (stud.type != "admin") {
        const isAttended = await session.hasAttendedSession(stud.id, currSession.sessionId);

        if (isAttended) {
            logger.info(`${requester} Already attended session: ${currSession.sessionId}`);
            return res.status(200).json({
                status: "success",
                data: { message: "Re-attending this session" }
            });
        }

        await session.recordAttendance(stud.id, currSession.sessionId);
        logger.info(`${requester} Attendance recorded for session: ${currSession.sessionId}`);
        return res.status(200).json({
            status: "success",
            data: { message: "Attendance recorded successfully" }
        });
    }
    logger.info(`${requester} Admin entering session: ${currSession.sessionId}`);
    return res.status(200).json({
        status: "success",
        data: { message: "Admin entering session." }
    });
});

const getAllAttendanceForSession = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const adminGroup = req.admin.group;
    const sessionToGet = req.sessionData;
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Fetching attendance for session: ${sessionToGet.sessionId}, group: ${adminGroup}`);
    const attendanceRecords = await session.getAllAttendanceForASession(sessionToGet.sessionId);
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Attendance records retrieved for session: ${sessionToGet.sessionId}, count: ${attendanceRecords.length}`);
    return res.status(200).json({
        status: "success",
        results: attendanceRecords.length,
        data: { attendanceRecords }
    });
});

const getAllSessions = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;
    const userType = req.user.type;
    const userId = req.user.id;
    const requester = userType === 'student'
        ? `[student : ${req.user.email} | ${req.user.name} | ${req.user.group}]`
        : `[admin : ${req.user.email} | ${req.user.name} | ${req.user.group}]`;
    logger.debug(`${requester} Fetching all sessions for group: ${userGroup}, type: ${userType}`);
    let sessions;
    if (userType === 'admin') {
        sessions = await session.findAllSessionsByAdminGroup(userGroup);
    } else if (userType === 'student') {
        sessions = await session.findAllSessionsByStudentGroup(userGroup, userId);
    }
    logger.info(`${requester} Sessions fetched, count: ${sessions.length}`);
    return res.status(200).json({
        status: "success",
        results: sessions.length,
        data: { sessions }
    });
})

const getActiveSession = asyncWrapper(async (req, res, next) => {
    const activeSession = req.activeSession;
    const requester = req.user?.type === 'student'
        ? `[student : ${req.user.email} | ${req.user.name} | ${req.user.group}]`
        : `[admin : ${req.user?.email} | ${req.user?.name} | ${req.user?.group}]`;
    logger.debug(`${requester} Fetching active session`);
    logger.info(`${requester} Active session found: ${activeSession.sessionId}`);
    return res.status(200).json({
        status: "success",
        data: { activeSession },
    });
});

const getLastCreatedSession = asyncWrapper(async (req, res, next) => {
    const adminGroup = req.admin.group;
    logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Fetching last created session for group: ${adminGroup}`);
    const lastSession = await session.getLastCreatedSessionByGroup(adminGroup);
    if (!lastSession) {
        logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] No sessions found for group: ${adminGroup}`);
        return next(new AppError("No sessions found for your group", httpStatus.Success));
    }
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Last session found: ${lastSession.sessionId}`);
    return res.status(200).json({
        status: "success",
        data: { lastSession }
    });
});

module.exports = {
    attendSession,
    startSession,
    endSession,
    getAllAttendanceForSession,
    getAllSessions,
    getActiveSession,
    getLastCreatedSession
}
