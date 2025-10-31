const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth_middleware');
const assignControllers = require('../controllers/assignment_controller');
const assignMiddleWare = require('../middleware/assignment_middleware');
const quizMiddleware = require('../middleware/quiz_middleware');
const { checkSemester } = require('../middleware/topic_middleware');

router.route('/createAssignment')
    .post(auth.adminProtect, assignMiddleWare.checkField,checkSemester ,assignControllers.createAssignment)

router.route('/getAllAssignments')
    .get(auth.protect, quizMiddleware.getGroup, assignControllers.getAllAssignments)

router.route('/get_assignment_by_id/:assignId')
    .get(auth.protect,assignMiddleWare.assignExists,assignMiddleWare.canSeeAssign,assignControllers.getAssignmentById)

router.route('/submitAssignment/:assignId')
    .post(auth.protect, assignMiddleWare.assignExists, assignMiddleWare.canSeeAssign ,
        assignMiddleWare.submittedBefore, quizMiddleware.verifySubmissionPDF ,assignControllers.submitAssignment)

router.route('/getUnsubmittedAssignments')
    .get(auth.studentProtect, assignControllers.getUnsubmittedAssignments)

router.route('/deleteAssignment/:assignId')
    .delete(auth.adminProtect, assignMiddleWare.assignExists,assignMiddleWare.authorisedToModify, assignControllers.deleteAssignment)
    
router.route('/modifyAssignment/:assignId')
    .patch(auth.adminProtect, assignMiddleWare.assignExists,assignMiddleWare.authorisedToModify, assignControllers.modifyAssignment)


module.exports = router;