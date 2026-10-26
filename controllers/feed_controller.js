const AppError = require("../utils/app.error.js");
const httpStatus = require("../utils/http.status.js");
const asyncWrapper = require("../middleware/asyncwrapper.js");
const Feed = require('../models/feed_model.js');
const feed = require('../data_link/feed_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const sse = require('../utils/sseClients.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger');

const getFeed = asyncWrapper(async (req, res, next) => {
  logger.debug(`[system] Fetching all feed posts`);
  const feeds = await feed.getAllFeeds();
  if (!feeds || feeds.length === 0) {
    logger.info(`[system] Feed is empty`);
    return next(AppError.create("Feed is empty", 404, httpStatus.NotFound));
  }
  logger.info(`[system] Feed fetched, count: ${feeds.length}`);
  res.status(200).json({
    status: "success",
    results: feeds.length,
    data: feeds,
  });
});

const postOnFeed = asyncWrapper(async (req, res) => {
  sanitizeInput(req.body);
  const { text, semester } = req.body;
  const adminId = req.admin.id;
  const adminRecord = await admin.findAdminById(adminId);
  const adminName = adminRecord.name;
  const adminGroup = req.admin.group;

  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Creating feed post, semester: ${semester}, group: ${adminGroup}`);

  const newPost = await feed.createPost(text, semester, adminId);

  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Notifying students in group: ${adminGroup}`);
  sse.notifyStudents(adminGroup, {
    event: "feed_new",
    message: `New feed post from admin ${adminName}`,
    post: {
      id: newPost.id,
      text: newPost.text,
      semester: newPost.semester,
      group: adminGroup,
      adminId: newPost.adminId,
      createdAt: newPost.createdAt,
    },
  });

  logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Feed post created successfully, id: ${newPost.id}`);
  return res.status(201).json({
    status: "success",
    data: { message: "Post created & submitted successfully" }
  });
});

module.exports = {
  getFeed,
  postOnFeed
};
