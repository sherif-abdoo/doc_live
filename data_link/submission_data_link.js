const sequelize = require('../config/database');
const Admin = require('../models/admin_model');
const Student = require('../models/student_model');
const asyncWrapper = require('../middleware/asyncwrapper');
const Rejection = require('../models/rejection_model');
const Registration = require('../models/registration_model');
const Session = require('../models/session_model');
const Feed = require('../models/feed_model');
const Submission = require('../models/submission_model');


async function getSubmissionForAssignment(studentId, assignmentId){
    return await Submission.findOne({
    where: {
      studentId,
      assId: assignmentId,
      type: 'assignment'
    }
  });
}

async function getSubmissionForQuiz(studentId,quizId){
    return await Submission.findOne({
    where: {
      studentId,
      quizId,
      type: 'quiz'
    }
  });
}

function getSubmissionsByStudentId(studentId){
    return Submission.findAll({
        where: {
            studentId
        }
    });
}

function deleteSubmissionBySemester(semester){
    return Submission.destroy({
        where: {
            semester
        }
    });
}

module.exports = { 
    getSubmissionForAssignment,
    getSubmissionForQuiz,
    deleteSubmissionBySemester,
    getSubmissionsByStudentId
}

