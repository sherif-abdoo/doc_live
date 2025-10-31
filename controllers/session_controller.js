const sequelize = require('../config/database');
const Student = require('../models/student_model.js');
const student = require('../data_link/student_data_link');
const admin = require('../data_link/admin_data_link.js');
const Admin = require('../models/admin_model.js');
const session = require('../data_link/session_data_link.js');
const bcrypt = require('bcrypt');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const { getCache } = require("../utils/cache");
const { setCache } = require("../utils/cache");
const jwt = require("jsonwebtoken");
const sse = require('../utils/sseClients.js');
const {sanitizeInput} = require('../utils/sanitize.js');
const topicDl = require('../data_link/topic_data_link.js'); 

const startSession = asyncWrapper(async (req, res) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
   // sanitizeInput(req.body);
//   const { group } = user.Usergroup;
  const adminId = req.admin.id;
  const sgroup = req.body?.group && req.body.group.trim() !== ""   ? req.body.group   : req.admin.group;
  console.log("Admin Group:", sgroup); // Debugging line

  const adminN = await admin.findAdminById(adminId);
  const adminName = adminN.name;
  const today = new Date();
  const dayName = days[today.getDay()];
  const currTopic = await topicDl.getStudentLastTopic(sgroup);
  const newSession = await admin.createSession(currTopic.topicId,sgroup, currTopic.semester, today, dayName);

   sse.notifyStudents(sgroup, {
        event: "session_update",
        message: `Group ${sgroup}, a date for the upcoming session has been dropped by ${adminName}. Please check your dashboard.`,
        post: {
            dateAndTime: today,
            topic: currTopic.title,
        },
      });
  return res.status(201).json({
    status: "success",
     message: "Session created successfully",
    data: { id: newSession.sessionId,
        topicId: newSession.topicId,
        group: newSession.group,
        semester: newSession.semester,
        dateAndTime: newSession.dateAndTime,
        day: newSession.day
     }
  })});


const endSession = asyncWrapper(async (req, res, next) => {
    const adminGroup = req.admin.group;
    const currSession = await session.getActiveSessionByAGroup(adminGroup);
    if (!currSession) {
        return next(new AppError("No active session found for your group", httpStatus.NOT_FOUND));
    }
    currSession.finished = true;
    await currSession.save();
    return res.status(200).json({
        status: "success",
        data: { message: "Session ended successfully" }
    });
})

const attendSession = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const stud = req.student;
    const currSession = req.activeSession;
    const isAttended = await session.hasAttendedSession(stud.id, currSession.sessionId);
    if (isAttended) {
        return res.status(200).json({
            status: "success",
            data: { message: "Re-attending this session" }
        });
    }
    await session.recordAttendance(stud.id, currSession.sessionId);
    return res.status(200).json({
        status: "success",
        data: { message: "Attendance recorded successfully" }
    });
});


const getAllAttendanceForSession=asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const adminGroup = req.admin.group;
    const sessionToGet = req.sessionData;
    const attendanceRecords = await session.getAllAttendanceForASession(sessionToGet.sessionId);
    return res.status(200).json({
        status: "success",
        results: attendanceRecords.length,
        data: { attendanceRecords }
    });
});

const getAllSessions = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;
    const userType = req.user.type; // 'student' or 'admin'
    const userId = req.user.id;
    let sessions; 
    if (userType === 'admin') {
        sessions = await session.findAllSessionsByAdminGroup(userGroup);
    } else if (userType === 'student') {
        sessions = await session.findAllSessionsByStudentGroup(userGroup, userId);
    }
    return res.status(200).json({
        status: "success",
        results: sessions.length,
        data: { sessions }
    });

})

const getActiveSession = asyncWrapper(async (req, res, next) => {
  const adminGroup = req.admin.group;
  const activeSession = await session.getActiveSessionByGroup(adminGroup);

  if (!activeSession) {
    return res.status(404).json({
      status: "error",
      message: "No active sessions were found",
    });
  }

  return res.status(200).json({
    status: "success",
    data: { activeSession },
  });
});

const getLastCreatedSession = asyncWrapper(async (req, res, next) => {
    const adminGroup = req.admin.group;
    const lastSession = await session.getLastCreatedSessionByGroup(adminGroup);
    if (!lastSession) {
        return next(new AppError("No sessions found for your group", httpStatus.NOT_FOUND));
    }
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