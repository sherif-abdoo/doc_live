// controllers/authController.js
const AppError = require("../utils/app.error.js"); // adjust path
const httpStatus = require("../utils/http.status.js"); // adjust path
const asyncWrapper = require("../middleware/asyncwrapper.js");
const Feed = require('../models/feed_model.js');
const feed = require('../data_link/feed_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const sse = require('../utils/sseClients.js');
const {sanitizeInput} = require('../utils/sanitize.js'); 

const getFeed = asyncWrapper(async (req, res, next) => {
  const feeds = await feed.getAllFeeds();
  if (!feeds || feeds.length === 0) {
    return next(AppError.create("Feed is empty", 404, httpStatus.NotFound));
  }
  res.status(200).json({
    status: "success",
    results: feeds.length,
    data: feeds,
  });
})

const postOnFeed = asyncWrapper(async (req, res) => {
  sanitizeInput(req.body);
  const { text, semester } = req.body;
  const adminId = req.admin.id;
  const adminRecord = await admin.findAdminById(adminId);
  const adminName = adminRecord.name; 
  const adminGroup = req.admin.group; // 👈 "all" or specific group

  // Create the post
  const newPost = await feed.createPost(text, semester, adminId);

  // Notify students
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

  return res.status(201).json({
    status: "success",
    data: { message: "Post created & submitted successfully" }
  });
});

module.exports = {
  getFeed,
  postOnFeed
};