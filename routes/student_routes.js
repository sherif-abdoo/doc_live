const express = require('express');
const router = express.Router();
const studentControllers = require('../controllers/student_controller');
const studentMiddleWare = require('../middleware/student_middleware');
const adminMiddleWare = require('../middleware/admin_middleware');
const sessionMiddleWare = require('../middleware/session_middleware');
const feedMiddleware = require('../middleware/feed_middleware');
const assignmentControllers = require('../controllers/assignment_controller');
const auth = require('../middleware/auth_middleware');
const submissionMiddleware = require('../middleware/submission_middleware');
const { establishStudentConnection } = require('../controllers/SSE_connection');
const { getMyWeeklyReport } = require('../controllers/student_report');

router.route('/studentRegister')
    .post(studentMiddleWare.studentFound,studentMiddleWare.phoneNumberexists,adminMiddleWare.passwordEncryption,studentControllers.studentRegister);

router.route('/studentSSEConnection')
    .get(auth.studentProtect, establishStudentConnection);

router.route('/showMyAdminProfile')
    .get(auth.studentProtect, studentControllers.showMyAdminProfile);

router.route('/showMyProfile')
    .get(auth.studentProtect, studentControllers.showMyProfile);  

router.route('/getMyFeed')
    .get(auth.studentProtect,feedMiddleware.deletePostsGreaterThan14Days , studentControllers.getMyFeed);    

router.route('/showMySubmission')
    .get(auth.studentProtect, studentControllers.showMySubmission);

router.route('/showSubmission/:id')
    .get(auth.studentProtect,submissionMiddleware.subExist ,studentMiddleWare.canSeeSubmission,studentControllers.showASubmission);

router.route('/showMarkedSubmission/:id')
    .get(auth.studentProtect,submissionMiddleware.subExist, submissionMiddleware.subMarked ,studentMiddleWare.canSeeSubmission,studentControllers.getMarkForSubmission);


router.route('/getQuizTrend')
    .get(auth.studentProtect,studentControllers.getQuizTrend);   

router.get('/getMyWeeklyReport{/:topicId}',auth.studentProtect,getMyWeeklyReport);

router.route('/getUnsubmittedAssignments')
    .get(auth.studentProtect, assignmentControllers.getUnsubmittedAssignments);




module.exports = router;