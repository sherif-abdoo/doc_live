const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feed_controller.js');
const feedMiddleware = require('../middleware/feed_middleware.js');
const auth = require('../middleware/auth_middleware');

router.route('/')
    .get(auth.protect ,feedMiddleware.deletePostsGreaterThan14Days ,feedController.getFeed);

router.route('/postOnFeed')
    .post(auth.adminProtect, feedController.postOnFeed);

module.exports = router;