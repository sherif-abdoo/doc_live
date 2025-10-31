const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth_middleware');
const sessionControllers = require('../controllers/session_controller');
const studentControllers = require('../controllers/student_controller');
const studentMiddleWare = require('../middleware/student_middleware');
const sessionMiddleWare = require('../middleware/session_middleware');

router.route('/attendSession')
    .post(auth.studentProtect,sessionMiddleWare.activeSessionExists,  sessionControllers.attendSession);

// router.route('/createSession')
//     .post(auth.adminProtect, sessionControllers.createSession);

// router.route('/startSession/:sessionId')
//     .patch(auth.adminProtect, sessionMiddleWare.sessionFound, sessionMiddleWare.canAccessSession, sessionControllers.startSession);    

// router.route('/getActiveSession')
//     .get(auth.studentProtect, sessionMiddleWare.activeSessionExists, sessionMiddleWare.canAccessActiveSession, sessionControllers.getActiveSession);

// router.route('/getUpcomingSession')
//     .get(auth.studentProtect, sessionMiddleWare.upcomingSession, sessionControllers.getUpcomingSession);

router.route('/startSession')
    .post(auth.adminProtect, sessionMiddleWare.preventMultipleActiveSessions,sessionControllers.startSession);

router.route('/endSession') 
    .patch(auth.adminProtect, sessionControllers.endSession);

router.route('/getAllAttendanceForSession/:sessionId')
    .get(auth.adminProtect, sessionMiddleWare.sessionFound, sessionMiddleWare.canAccessSession, sessionControllers.getAllAttendanceForSession);

router.route('/getAllSessions')
    .get(auth.protect, sessionControllers.getAllSessions);
  
router.route('/getActiveSession')
    .get(auth.adminProtect, sessionControllers.getActiveSession);
    
router.route('/getLastCreatedSession')
    .get(auth.adminProtect, sessionControllers.getLastCreatedSession);    

module.exports = router;