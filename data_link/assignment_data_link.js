const sequelize = require('../config/database');
const { Op, col, literal } = require("sequelize");
const Assignment = require('../models/assignment_model');
const Admin = require('../models/admin_model');
const Submission = require('../models/submission_model');
const Topic = require('../models/topic_model.js');

Assignment.belongsTo(Admin, { foreignKey: "publisher" });

Assignment.belongsTo(Topic, { foreignKey: 'topicId' });

function createAssignment(mark, document, startDate, endDate, semester, publisher, topicId, title, description) {
  return Assignment.create(
    { mark, document, startDate, endDate, semester, publisher, topicId, title, description }) //7aga
}

async function getAllAssignments() {
  return Assignment.findAll({
    attributes: {
      include: [
        ['assignId', 'id'],
        [col('Admin.group'), 'group'],
        [col('Topic.subject'), 'subject']
      ]
    },
    order: [['assignId', 'DESC']],
    include: [
      {
        model: Topic,
        attributes: []
      },
      {
        model: Admin,
        attributes: [] // no "where" — show all admins' assignments
      }
    ]
  });
}

async function getAllAssignmentsByGroup(group) {
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

  // Step 2: get all assignments for those topics
  return await Assignment.findAll({
    attributes: {
      include: [
        ['assignId', 'id'],
        [col('Topic.group'), 'group'],
        [col('Topic.subject'), 'subject']
      ]
    },
    where: {
      topicId: { [Op.in]: topicIds }
    },
    include: [
      { model: Admin, attributes: [] },
      { model: Topic, attributes: [] }
    ],
    order: [['assignId', 'DESC']]
  });
}
function getAssignmentById(assignId) {
  return Assignment.findOne({
    where: { assignId },
    attributes: { include: [['assignId', 'id']] }
  });
}

function createSubmission(assId, studentId, assistantId, answers, semester) {
  return Submission.create({ assId, studentId, assistantId, answers, semester, "type": "assignment" })
}

function findSubmissionByQuizAndStudent(assignId, studentId) {
  return Submission.findOne({ where: { assignId, studentId } })
}

function findSubmissionByAssignmentAndStudent(assId, studentId) {
  return Submission.findOne({
    where: {
      assId,
      studentId,
      type: 'assignment'   // make sure it's assignment
    }
  });
}

async function getAssignmentsByTopicId(topicId) {
  return await Assignment.findAll({
    where: { topicId },
    attributes: ['assignId', ['assignId', 'id'], 'title', 'startDate', 'mark'], // only return id and name
    order: [['assignId', 'DESC']]
  });
}

function findAssignmentAndDelete(assignId) {
  return Assignment.destroy({ where: { assignId } });
}

// async function getAllAssignmentsByGroup(group) {
//   return Assignment.findAll({
//     where: { group },
//     include: { model: Topic, attributes: ['subject'] }
//   });
// }

function deleteAssignmentBySemester(semester) {
  return Assignment.destroy({
    where: {
      semester: {
        [Op.iLike]: `%${semester}%` // matches "nov", "November", etc.
      }
    }
  });
}

module.exports = {
  createAssignment,
  getAllAssignments,
  getAllAssignmentsByGroup,
  getAssignmentById,
  createSubmission,
  findSubmissionByQuizAndStudent,
  findSubmissionByAssignmentAndStudent,
  getAssignmentsByTopicId,
  findAssignmentAndDelete,
  deleteAssignmentBySemester,
}