const sequelize = require('../config/database');
const { Sequelize } = require('sequelize'); // make sure to import Sequelize
const { Op } = require("sequelize");
const Quiz = require('../models/quiz_model');
const Admin = require('../models/admin_model');
const Submission = require('../models/submission_model');
const Topic = require('../models/topic_model');

Quiz.belongsTo(Admin, { foreignKey: "publisher" });
Quiz.belongsTo(Topic, { foreignKey: "topicId", as: 'topic' });

function createQuiz(mark,publisher,date,semester,durationInMin,topicId, title){
  //nmark,publisher,date,semester,ndurationInMin, topicId, title
    return Quiz.create({mark,publisher,date,semester,durationInMin, topicId, title, createdAt: Date.now()});
}; // nice comment

function getAllQuizzes(){
    return Quiz.findAll({attributes : {include: [
        ['quizId', 'id'],
    ]},
    include: [
      {
        model: Topic,
        as: 'topic', // only needed if you used 'as' in association
        attributes: ['subject'] // or ['name'], depending on your column
      }
    ],
     order: [['quizId', 'DESC']]});
};


async function getAllQuizzesForGroup(group) {
  return await Quiz.findAll({
    attributes: {
      include: [
        ['quizId', 'id'],
        [Sequelize.col('Admin.group'), 'group'],      // flatten group
        [Sequelize.col('topic.subject'), 'subject']   // flatten subject
      ]
    },
    include: [
      {
        model: Admin,
        attributes: [], // don't include Admin as nested object
        where: {
          [Op.or]: [
            { group: group },
            { group: "all" }
          ]
        }
      },
      {
        model: Topic,
        as: 'topic',
        attributes: [] // don't include topic as nested object
      }
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

function createSubmission(quizId, studentId,assistantId ,answers, semester) {
    return Submission.create({ quizId, studentId,assistantId ,answers, semester, type : "quiz" });
}

function findSubmissionByQuizAndStudent(quizId,studentId){
    return Submission.findOne({where :{quizId,studentId,type:"quiz"}, order: [['subDate', 'DESC']]});
}

async function getQuizzesByTopicId(topicId) {
    return await Quiz.findAll({
    where: { topicId },
    attributes: ['quizId',['quizId', 'id'], 'title', 'mark'], order: [['quizId','DESC']] // only return id and name
  });
}

function findQuizAndDelete(quizId) {
    return Quiz.destroy({ where: { quizId } });
}

function deleteQuizBySemester(semester) {
    return Quiz.destroy({ where: { semester } });
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