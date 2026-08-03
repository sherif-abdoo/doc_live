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

const startSession = asyncWrapper(async (req, res) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    sanitizeInput(req.body);
    const adminId = req.admin.id;
    const sgroup = req.admin.group;
    logger.debug(`[admin : ${req.admin.email}] Admin group: ${sgroup}`);

    const adminName = req.admin.name;
    const today = new Date();
    const dayName = days[today.getDay()];
    const currTopic = await topicDl.getStudentLastTopic(sgroup);
    logger.debug(`[admin : ${req.admin.email}] Current topic: ${currTopic.topicId} - ${currTopic.title}`);

    const newSession = await admin.createSession(currTopic.topicId, sgroup, currTopic.semester, today, dayName);
    const key = `activeSession:${sgroup}`;
    logger.debug(`[admin : ${req.admin.email}] Setting cache with key: ${key}`);
    setCache(key, newSession, 60 * 60 * 24);
    sse.notifyStudents(sgroup, {
        event: "session_update",
        message: `Group ${sgroup}, a date for the upcoming session has been dropped by ${adminName}. Please check your dashboard.`,
        post: {
            dateAndTime: today,
            topic: currTopic.title,
        },
    });
    logger.info(`[admin : ${req.admin.email}] Session created successfully for group: ${sgroup}, sessionId: ${newSession.sessionId}`);
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
    logger.debug(`[admin : ${req.admin.email}] Ending session for group: ${adminGroup}`);
    const currSession = await session.getActiveSessionByAGroup(adminGroup);
    if (!currSession) {
        logger.info(`[admin : ${req.admin.email}] No active session found for group: ${adminGroup}`);
        return next(new AppError("No active session found for your group", httpStatus.NOT_FOUND));
    }
    currSession.finished = true;
    await currSession.save();
    deleteCache(`activeSession:${adminGroup}`);
    logger.info(`[admin : ${req.admin.email}] Session ${currSession.sessionId} ended for group: ${adminGroup}`);
    return res.status(200).json({
        status: "success",
        data: { message: "Session ended successfully" }
    });
})

const attendSession = asyncWrapper(async (req, res, next) => {
    const stud = req.user;
    const currSession = req.activeSession;
    const requester = stud.type === 'student' ? `[student : ${req.user.email}]` : `[admin : ${req.user.email}]`;
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
    logger.debug(`[admin : ${req.admin.email}] Fetching attendance for session: ${sessionToGet.sessionId}, group: ${adminGroup}`);
    const attendanceRecords = await session.getAllAttendanceForASession(sessionToGet.sessionId);
    logger.info(`[admin : ${req.admin.email}] Attendance records retrieved for session: ${sessionToGet.sessionId}, count: ${attendanceRecords.length}`);
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
    const requester = userType === 'student' ? `[student : ${req.user.email}]` : `[admin : ${req.user.email}]`;
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
    const adminGroup = req.admin.group;
    logger.debug(`[admin : ${req.admin.email}] Fetching active session for group: ${adminGroup}`);
    const activeSession = await session.getActiveSessionByGroup(adminGroup);

    if (!activeSession) {
        logger.info(`[admin : ${req.admin.email}] No active session found for group: ${adminGroup}`);
        return res.status(404).json({
            status: "error",
            message: "No active sessions were found",
        });
    }

    logger.info(`[admin : ${req.admin.email}] Active session found: ${activeSession.sessionId}`);
    return res.status(200).json({
        status: "success",
        data: { activeSession },
    });
});

const getLastCreatedSession = asyncWrapper(async (req, res, next) => {
    const adminGroup = req.admin.group;
    logger.debug(`[admin : ${req.admin.email}] Fetching last created session for group: ${adminGroup}`);
    const lastSession = await session.getLastCreatedSessionByGroup(adminGroup);
    if (!lastSession) {
        logger.info(`[admin : ${req.admin.email}] No sessions found for group: ${adminGroup}`);
        return next(new AppError("No sessions found for your group", httpStatus.Success));
    }
    logger.info(`[admin : ${req.admin.email}] Last session found: ${lastSession.sessionId}`);
    return res.status(200).json({
        status: "success",
        data: { lastSession }
    });
});

// const startSession = asyncWrapper(async (req, res) => {
//     sanitizeInput(req.params);
//     const { sessionId } = req.params;
//     const adminGroup = req.admin.group;

//     const sessionsData = await session.findSessionById(sessionId);
//     if (!sessionsData) {
//         return next(new AppError("Session not found", httpStatus.NOT_FOUND));
//     }

//     // Update session start time
//     await session.UpdateSession(sessionId, new Date());

//     const cacheKey = `activeSession:${adminGroup}`;

//     // ✅ no need to remap keys
//     await setCache(cacheKey, sessionsData, 9000);

//     // Notify students
//     sse.notifyStudents(adminGroup, {
//         event: "Session Started",
//         message: `Group ${adminGroup}, the session has started. Please join using the provided link.`,
//         post: {
//             sessionId: sessionsData.sessionId, // 👈 already exists
//             link: sessionsData.link,
//             dateAndTime: sessionsData.dateAndTime
//         },
//     });

//     return res.status(200).json({
//         status: "success",
//         data: { message: "Session started and students notified" }
//     });
// });

// const getActiveSession = asyncWrapper(async (req, res, next) => {
//     const activeSession = req.activeSession;
//     return res.status(200).json({
//         status: "success",
//         data: { activeSession }
//     });
// });

// const getUpcomingSession = asyncWrapper(async (req, res) => {
//   return res.status(200).json({
//     status: "success",
//     data: { upcoming: req.upcomingSession }
//   });
// });


module.exports = {
    attendSession,
    startSession,
    endSession,
    getAllAttendanceForSession,
    getAllSessions,
    getActiveSession,
    getLastCreatedSession
    // getActiveSession,
    // getUpcomingSession
}