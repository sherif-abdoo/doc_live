const AppError = require("../utils/app.error"); // adjust path
const httpStatus = require("../utils/http.status"); // adjust path
const asyncWrapper = require("../middleware/asyncwrapper");
const Feed = require('../models/feed_model.js');
const feed = require('../data_link/feed_data_link.js');

const deletePostsGreaterThan14Days = asyncWrapper(async (req, res, next) => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  await feed.destroyOldFeeds(fourteenDaysAgo);

  next();
})

module.exports = {
    deletePostsGreaterThan14Days,
    };