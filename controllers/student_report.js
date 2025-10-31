// ==================== GET MY WEEKLY REPORT FUNCTION ====================
const sequelize = require('../config/database');
const Student = require('../models/student_model.js');
const student = require('../data_link/student_data_link');
const admin = require('../data_link/admin_data_link.js');
const feed = require('../data_link/feed_data_link.js');
const bcrypt = require('bcrypt');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const jwt = require("jsonwebtoken");
const { notifyAssistants } = require('../utils/sseClients');
const Registration = require('../models/registration_model.js');
const Submission = require('../models/submission_model');
const submission = require('../data_link/submission_data_link.js');
const Assignment = require('../models/assignment_model');
const assignment = require('../data_link/assignment_data_link.js');
const Quiz = require('../models/quiz_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const Topic = require('../models/topic_model');
const topicDl = require('../data_link/topic_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const sessionDl = require('../data_link/session_data_link.js');

// Helper: normalize null/undefined values to "N/A"
const normalize = (value) => (value === null || value === undefined ? "N/A" : value);

// Helper function to get student submission for assignment
const getStudentSubmissionForAssignment = async (studentId, assignmentId) => {
  return await submission.getSubmissionForAssignment(studentId,assignmentId);
};

// Helper function to get student submission for quiz
const getStudentSubmissionForQuiz = async (studentId, quizId) => {
  return submission.getSubmissionForQuiz(studentId,quizId);
};

const getMyWeeklyReport = asyncWrapper(async (req, res) => {
  sanitizeInput(req.params);
  const { topicId } = req.params;
  const studentId = req.student.id;

  try {
    // Get student data
    const studentData = await student.findStudentById(studentId);
    if (!studentData) {
      return res.status(404).json({
        status: "error",
        message: "Student not found"
      });
    }

    // Get topic details
    let topic;
    if (topicId) {
      topic = await topicDl.getTopicById(topicId);
      if (!topic) {
        return res.status(404).json({
          status: "error",
          message: "Topic not found"
        });
      }
      if (topic.group !== studentData.group) {
        return res.status(403).json({
          status: "error",
          message: "You are not authorized to access this topic"
        });
      }
    } else {
      topic = await topicDl.getStudentLastTopic(req.student.group);
    }

    const topicSessions = await sessionDl.countTotalSessionsByTopic(topic.topicId);
    const attendedSessions = await sessionDl.countAttendedSessionsByTopic(studentId, topic.topicId);

    // Get assignments & quizzes
    const assignments = await assignment.getAssignmentsByTopicId(topic.topicId);
    const quizzes = await quiz.getQuizzesByTopicId(topic.topicId);

    // Default quiz grade
    let quizGrade = "N/A";
    let quizData= null;

    // Build base report object
    const reportData = {
      id: topic.topicId,
      topicTitle: topic.topicName,
      studentName: studentData.studentName,
      semester: topic.semester,
      totalSessions: topicSessions,
      sessionsAttended: attendedSessions,
      totalAssignments: assignments.length,
      submittedAssignments: 0,
      quizGrade,
      quizData,
      materials: [],
      sessions: [] // 👈 sessions go here
    };

    const now = new Date();

    // ==================== ADD SESSIONS SECTION ====================
    reportData.sessions = await sessionDl.getSessionsByTopic(topic.topicId, studentId);
    // ===============================================================

    // Process assignments
    for (let index = 0; index < assignments.length; index++) {
      const assignmentItem = assignments[index];
      const submission = await getStudentSubmissionForAssignment(studentId, assignmentItem.assignId);

      let status = "Missing";
      let subId= "N/A"; 
      if (submission) {
        if (submission.marked ) {
          status = "Marked";
          subId= submission.subId;
        } else {
          status = "Pending Review";
        }
        reportData.submittedAssignments++;
      } else if (assignmentItem.endDate && new Date(assignmentItem.endDate) > now) {
        status = "Unsubmitted (Still Open)";
      }

      reportData.materials.push({
        id: assignmentItem.assignId,
        title: assignmentItem.title,
        maxPoints: assignmentItem.mark,
        date: assignmentItem.startDate,
        status,
        submissionId: subId,
        score: submission ? normalize(submission.score) : "N/A",
        feedback: submission ? normalize(submission.feedback) : "N/A"
      });
    }

    // Process quizzes
    for (let index = 0; index < quizzes.length; index++) {
      const quizItem = quizzes[index];
      const submission = await getStudentSubmissionForQuiz(studentId, quizItem.quizId);

      let percentage = "N/A";
      let grade = "N/A";
      let status = "Missing";

      if (submission) {
        if (submission.marked) {
          status = "Marked";
        } else {
          status = "Pending Review";
        }

        const score = submission.score !== null && submission.score !== undefined ? Number(submission.score) : null;
        const maxMark = quizItem.mark !== null && quizItem.mark !== undefined ? Number(quizItem.mark) : null;

        if (score !== null && maxMark !== null && maxMark > 0) {
          percentage = Number(((score / maxMark) * 100).toFixed(2));

          if (percentage >= 80) grade = 'A*';
          else if (percentage >= 70) grade = 'A';
          else if (percentage >= 60) grade = 'B';
          else if (percentage >= 50) grade = 'C';
          else grade = 'U';

          quizGrade = grade; // update top-level quiz grade
        }
      } else if (quizItem.endDate && new Date(quizItem.endDate) > now) {
        status = "Unsubmitted (Still Open)";
      }

      quizData ={
        type: 'quiz',
        id: quizItem.quizId,
        columnName: `Quiz${index + 1}`,
        title: quizItem.title,
        maxPoints: quizItem.mark,
        status,
        submissionId: submission ? submission.subId : "N/A",  
        score: submission ? normalize(submission.score) : "N/A",
        percentage,
        grade,
        feedback: submission ? normalize(submission.feedback) : "N/A"
      };
    }

    // update reportData with final quizGrade
    reportData.quizGrade = quizGrade;
    reportData.quizData = quizData;
    
    return res.status(200).json({
      status: "success",
      message: "Weekly report generated successfully",
      data: reportData
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      error: error.message
    });
  }
});





module.exports = {
  getMyWeeklyReport
};

