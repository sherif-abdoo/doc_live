const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth_middleware');
const quizControllers = require('../controllers/quiz_controller');
const quizMiddleWare = require('../middleware/quiz_middleware');
const { checkSemester } = require('../middleware/topic_middleware');

router.route('/createQuiz')
    .post(auth.adminProtect, quizMiddleWare.checkFields,checkSemester ,quizControllers.createQuiz);

router.route('/getAllQuizzes')
    .get(auth.protect,quizMiddleWare.getGroup ,quizControllers.getAllQuizzes);

router.route('/get_quiz_by_id/:quizId')
    .get(auth.protect, quizMiddleWare.quizExists,quizMiddleWare.canSeeQuiz ,quizControllers.getQuizById);

router.route('/startQuiz/:quizId')
    .get(auth.adminProtect, quizMiddleWare.quizExists,quizMiddleWare.canAccessQuiz ,quizControllers.startQuiz);

router.route('/getActiveQuiz')
    .get(auth.protect, quizMiddleWare.activeQuizExists, quizMiddleWare.canAccessActiveQuiz ,quizControllers.getActiveQuiz); 
    
router.route('/submitActiveQuiz/')
    .post(auth.protect, quizMiddleWare.activeQuizExists, quizMiddleWare.canAccessActiveQuiz ,quizMiddleWare.submittedBefore,
        quizMiddleWare.verifySubmissionTiming, quizMiddleWare.verifySubmissionPDF ,quizControllers.submitActiveQuiz);

router.route('/submitQuiz/:quizId')
        .post(auth.protect, quizMiddleWare.quizExists, quizMiddleWare.canSeeQuiz ,
        quizMiddleWare.submittedBefore, quizMiddleWare.verifySubmissionPDF ,quizControllers.submitQuiz)

router.route('/modifyQuiz/:quizId')
        .patch(auth.adminProtect, quizMiddleWare.quizExists,quizMiddleWare.canAccessQuiz ,quizControllers.modifyQuiz)

router.route('/deleteQuiz/:quizId')
        .delete(auth.adminProtect, quizMiddleWare.quizExists,quizMiddleWare.canAccessQuiz ,quizControllers.deleteQuiz)

module.exports = router;