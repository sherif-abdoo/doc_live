const sequelize = require('../config/database');
const { Sequelize } = require('sequelize'); // make sure to import Sequelize
const { Op } = require("sequelize");
const Quiz = require('../models/quiz_model');
const Admin = require('../models/admin_model');
const Submission = require('../models/submission_model');
const Topic = require('../models/topic_model');
//ggg
Quiz.belongsTo(Admin, { foreignKey: "publisher" });
Quiz.belongsTo(Topic, { foreignKey: "topicId", as: 'topic' });

function createQuiz(mark, publisher, date, semester, durationInMin, topicId, title) {
  //nmark,publisher,date,semester,ndurationInMin, topicId, title
  return Quiz.create({ mark, publisher, date, semester, durationInMin, topicId, title, createdAt: Date.now() });
}; // nice comment

function getAllQuizzes() {
  return Quiz.findAll({
    attributes: {
      include: [
        ['quizId', 'id'], [Sequelize.col('Admin.group'), 'group'], [Sequelize.col('topic.subject'), 'subject']
      ]
    },
    include: [
      {
        model: Topic,
        as: 'topic', // only needed if you used 'as' in association
        attributes: [] // or ['name'], depending on your column
      }, {
        model: Admin,
        attributes: [] // no "where" — show all admins' quizzes
      }
    ],
    order: [['quizId', 'DESC']]
  });
};


async function getAllQuizzesForGroup(group) {
  // Step 1: get all topic IDs that belong to this group (or 'all')
  const topics = await Topic.findAll({
    where: {
      [Op.or]: [
        { group: group },
        { group: 'all' }
      ]
    },
    attributes: ['topicId']
  });

  const topicIds = topics.map(t => t.topicId);
  if (topicIds.length === 0) return [];

  // Step 2: get all quizzes for those topics
  return await Quiz.findAll({
    attributes: {
      include: [
        ['quizId', 'id'],
        [Sequelize.col('topic.group'), 'group'],
        [Sequelize.col('topic.subject'), 'subject']
      ]
    },
    where: {
      topicId: { [Op.in]: topicIds }
    },
    include: [
      { model: Admin, attributes: [] },
      { model: Topic, as: 'topic', attributes: [] }
    ],
    order: [['quizId', 'DESC']]
  });
}

function getQuizById(quizId) {
  return Quiz.findByPk(quizId, {
    attributes: {
      include: [['quizId', 'id']] // adds 'id' (aliased from 'quizId') alongside all original fields
    }
  });
}
function updateQuizDates(quizId, newDate) {
  return Quiz.update({ startDate: newDate }, { where: { quizId } });
}

function createSubmission(quizId, studentId, assistantId, answers, semester) {
  return Submission.create({ quizId, studentId, assistantId, answers, semester, type: "quiz" });
}

function findSubmissionByQuizAndStudent(quizId, studentId) {
  return Submission.findOne({ where: { quizId, studentId, type: "quiz" }, order: [['subDate', 'DESC']] });
}

async function getQuizzesByTopicId(topicId) {
  return await Quiz.findAll({
    where: { topicId },
    attributes: ['quizId', ['quizId', 'id'], 'title', 'mark'], order: [['quizId', 'DESC']] // only return id and name
  });
}

function findQuizAndDelete(quizId) {
  return Quiz.destroy({ where: { quizId } });
}

function deleteQuizBySemester(semester) {
  return Quiz.destroy({
    where: {
      semester: {
        [Op.iLike]: `%${semester}%` // matches "nov", "November", etc.
      }
    }
  });
}

module.exports = {
  createQuiz,
  getAllQuizzes,
  getAllQuizzesForGroup,
  getQuizById,
  updateQuizDates,
  createSubmission,
  findSubmissionByQuizAndStudent,
  getQuizzesByTopicId,
  findQuizAndDelete,
  deleteQuizBySemester
};