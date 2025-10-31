const { Op } = require("sequelize");
const sequelize = require('../config/database'); // ✅ Only once

const Feed = require('../models/feed_model.js');
const Admin = require('../models/admin_model.js');

// Association (usually better placed in a separate association file, but okay here)
Feed.belongsTo(Admin, {
  foreignKey: 'adminId',
  targetKey: 'adminId',
  as: 'admin'
});

async function getAllFeeds() {
  return await Feed.findAll({
    include: [{
      model: Admin,
      as: 'admin',
      attributes: [] // exclude nested admin object
    }],
    attributes: {
      include: [
        [sequelize.col('admin.name'), 'adminName'] // uses alias 'admin'
      ]
    }
  });
}

function getFeedByAssistantIdAndSemester(adminId, semester) {
  return Feed.findAll({
    where: { adminId, semester },
    order: [['dateAndTime', 'DESC']]
  });
}

function destroyOldFeeds(cutoffDate) {
  return Feed.destroy({
    where: {
      dateAndTime: {
        [Op.lte]: cutoffDate
      }
    }
  });
}

function createPost(text, semester, adminId) {
  return Feed.create({
    text,
    semester,
    adminId
  });
}

module.exports = {
  getAllFeeds,
  destroyOldFeeds,
  getFeedByAssistantIdAndSemester,
  createPost
};