const sequelize = require('../config/database');
const { Op, col, literal } = require("sequelize");
const Assignment = require('../models/assignment_model');
const Admin = require('../models/admin_model');
const Submission = require('../models/submission_model');
const Topic = require('../models/topic_model.js');

Assignment.belongsTo(Admin, { foreignKey: "publisher" });

Assignment.belongsTo(Topic, { foreignKey: 'topicId' });

function createAssignment(mark, document, startDate, endDate, semester, publisher,topicId, title, description){
    return Assignment.create(
        {mark, document, startDate, endDate, semester,publisher,topicId, title, description}) //7aga
}

async function getAllAssignments() {
  return Assignment.findAll({
    attributes: {include: [['assignId', 'id']], order: [['assignId', 'DESC']]} ,       
    include: { model: Topic, attributes: ['subject']},
  });
}


async function getAllAssignmentsByGroup(group) {
    return await Assignment.findAll({
        attributes: {
            include: [
                ['assignId', 'id'],                // rename assignId → id
                [col('Admin.group'), 'group'],     // flatten group
                [col('Topic.subject'), 'subject']  // flatten subject
            ]
        },
        include: [
            {
                model: Admin,
                attributes: [],
                where: {
                    [Op.or]: [
                        { group: group },
                        { group: "all" }
                    ]
                }
            },
            {
                model: Topic,
                attributes: []
            }
        ],
        order: [['assignId', 'DESC']] 
    });
}
function getAssignmentById(assignId){
    return Assignment.findOne({where : {assignId},
        attributes: { include : [['assignId' , 'id']]}});
}

function createSubmission(assId, studentId,assistantId,answers, semester){
    return Submission.create({assId, studentId, assistantId, answers, semester, "type":"assignment"})
}

function findSubmissionByQuizAndStudent(assignId,studentId){
    return Submission.findOne({where: {assignId,studentId}})
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
    attributes: ['assignId',['assignId', 'id'], 'title','startDate','mark' ], // only return id and name
    order: [['assignId', 'DESC']]
  });
}

function findAssignmentAndDelete(assignId){
    return Assignment.destroy({where: {assignId}});
}

// async function getAllAssignmentsByGroup(group) {
//   return Assignment.findAll({
//     where: { group },
//     include: { model: Topic, attributes: ['subject'] }
//   });
// }

function deleteAssignmentBySemester(semester) {
    return Assignment.destroy({ where: { semester } });
}

module.exports={
    createAssignment,
    getAllAssignments,
    getAllAssignmentsByGroup,
    getAssignmentById,
    createSubmission,
    findSubmissionByQuizAndStudent,
    findSubmissionByAssignmentAndStudent,
    getAssignmentsByTopicId,
    findAssignmentAndDelete,
    deleteAssignmentBySemester
}