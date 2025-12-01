const sequelize = require('../config/database');
const { Op } = require("sequelize");
const Admin = require('../models/admin_model');
const Topic = require('../models/topic_model');
// wah
Topic.belongsTo(Admin, { foreignKey: 'publisher', as: 'publisherAdmin' });

function createTopic(topicName, semester, publisher,subject,group) {
    return Topic.create({ topicName, semester, publisher, subject, group });
}

function getTopicById(topicId) {
    return Topic.findOne({ where: { topicId } });
}

function getStudentLastTopic(group) {
    return Topic.findOne({where:{group},
        order: [['createdAt', 'DESC']]
    });
}

async function getAllTopicsByGroup(group) {
    return await Topic.findAll({
        where: {
            [Op.or]: [
                { group },        // the user's group
                { group: 'all' }  // topics available to all
            ]
        },
        attributes: { include: [['topicId', 'id']] },
        order: [['createdAt', 'DESC']]
    });
}

/*async function getTopicByAssistantId(topicId,assistantId) {
    if (assistantId === 1){
        return Topic.findOne({
            where: { topicId }
        });
    }
    return Topic.findOne({
        where: { topicId: parseInt(topicId, 10), publisher: assistantId }
    });
}
*/

function getAllTopics() {
    return Topic.findAll({
        attributes: {
            include: [['topicId', 'id']]
        },
        order: [['createdAt', 'DESC']] // make sure topicId is a real column in your model
    });
}

function deleteTopicBySemester(semester) {
  return Topic.destroy({
    where: {
      semester: {
        [Op.iLike]: `%${semester}%` // matches "nov", "November", etc.
      }
    }
  });
}

module.exports = {
    createTopic,
    getTopicById,
    getAllTopicsByGroup,
    getAllTopics,
    getStudentLastTopic,
    //getTopicByAssistantId
    deleteTopicBySemester
};