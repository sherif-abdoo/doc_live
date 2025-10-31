const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth_middleware');
const topicControllers = require('../controllers/topic_controller');
const topicMiddleWare = require('../middleware/topic_middleware');

router.route('/createTopic')
    .post(auth.adminProtect, topicMiddleWare.checkSemester,topicMiddleWare.checkSubject ,topicControllers.createTopic);

router.route('/get_topic_by_id/:topicId')
    .get(auth.protect, topicMiddleWare.findTopicById,topicMiddleWare.canSeeTopic ,topicControllers.getTopicById);

router.route('/getAllTopics')
    .get(auth.protect, topicControllers.getAllTopics);

router.route('/updateTopic/:topicId')
    .patch(auth.adminProtect, topicMiddleWare.findTopicById, topicMiddleWare.canUpdateTopic, 
        topicMiddleWare.checkData, topicControllers.updateTopic);

router.route('/deleteTopic/:topicId')
    .delete(auth.adminProtect, topicMiddleWare.findTopicById, 
        topicMiddleWare.canUpdateTopic, topicControllers.deleteTopic);

module.exports = router;