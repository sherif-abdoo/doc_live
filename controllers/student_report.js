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
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const normalize = (value) => (value === null || value === undefined ? "N/A" : value);

const calculateGrade = (percentage) => {
  if (percentage >= 80) return 'A*';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  return 'U';
};

const getMyWeeklyReport = asyncWrapper(async (req, res) => {
  sanitizeInput(req.params);
  const { topicId } = req.params;
  const studentId = req.student.id;
  logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Requesting weekly report, topicId: ${topicId || 'latest'}`);

  try {
    const studentData = await student.findStudentById(studentId);
    if (!studentData) {
      logger.info(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Student not found`);
      return res.status(404).json({ status: "error", message: "Student not found" });
    }

    let topic;
    if (topicId) {
      topic = await topicDl.getTopicById(topicId);
      if (!topic) {
        logger.info(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Topic not found: ${topicId}`);
        return res.status(404).json({ status: "error", message: "Topic not found" });
      }
      if (topic.group !== studentData.group && topic.group !== "all") {
        logger.info(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Unauthorized access to topic: ${topicId}`);
        return res.status(403).json({ status: "error", message: "You are not authorized to access this topic" });
      }
    } else {
      topic = await topicDl.getStudentLastTopic(req.student.group);
    }

    logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Topic resolved: ${topic.topicId} - ${topic.topicName}`);

    // Fetch everything in parallel
    const [topicSessions, attendedSessions, assignments, quizzes, sessions] = await Promise.all([
      sessionDl.countTotalSessionsByTopic(topic.topicId),
      sessionDl.countAttendedSessionsByTopic(studentId, topic.topicId),
      assignment.getAssignmentsByTopicId(topic.topicId),
      quiz.getQuizzesByTopicId(topic.topicId),
      sessionDl.getSessionsByTopic(topic.topicId, studentId)
    ]);

    logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Assignments: ${assignments.length}, Quizzes: ${quizzes.length}`);

    const assignmentIds = assignments.map(a => a.assignId);
    const quizIds = quizzes.map(q => q.quizId);

    // Single bulk submission fetch for all assignments and quizzes
    const submissionConditions = [];
    if (assignmentIds.length > 0) {
      submissionConditions.push({ type: 'assignment', assId: { [Op.in]: assignmentIds }, studentId });
    }
    if (quizIds.length > 0) {
      submissionConditions.push({ type: 'quiz', quizId: { [Op.in]: quizIds }, studentId });
    }

    const allSubmissions = submissionConditions.length > 0
      ? await Submission.findAll({
        where: { [Op.or]: submissionConditions },
        attributes: ['subId', 'type', 'assId', 'quizId', 'score', 'marked', 'feedback']
      })
      : [];

    // Build lookup maps
    const assignmentSubMap = {};
    const quizSubMap = {};
    allSubmissions.forEach(sub => {
      if (sub.type === 'assignment') assignmentSubMap[sub.assId] = sub;
      else if (sub.type === 'quiz') quizSubMap[sub.quizId] = sub;
    });

    logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Submissions loaded: ${allSubmissions.length}`);

    const now = new Date();

    // Map assignments
    let submittedAssignments = 0;
    const assignmentList = assignments.map(a => {
      const sub = assignmentSubMap[a.assignId];
      let status = "Missing";
      let subId = "N/A";
      let hasMarkedPdf = false;

      if (sub) {
        const isMarked = sub.score !== null && sub.score !== undefined;
        status = isMarked ? "Marked" : "Pending Review";
        subId = sub.subId;
        hasMarkedPdf = !!sub.marked;
        submittedAssignments++;
      } else if (a.endDate && new Date(a.endDate) > now) {
        status = "Unsubmitted (Still Open)";
      }

      return {
        id: a.assignId,
        title: a.title,
        fullMark: a.mark,
        scoredMark: sub ? normalize(sub.score) : "N/A",
        date: a.startDate,
        status,
        submissionId: subId,
        hasMarkedPdf,
        feedback: sub ? normalize(sub.feedback) : "N/A"
      };
    });

    // Map quizzes
    const quizList = quizzes.map(q => {
      const sub = quizSubMap[q.quizId];
      let status = "Missing";
      let hasMarkedPdf = false;
      let scoredMark = "N/A";
      let percentage = "N/A";
      let grade = "N/A";

      if (sub) {
        const isMarked = sub.score !== null && sub.score !== undefined;
        if (isMarked) {
          status = "Marked";
          hasMarkedPdf = !!sub.marked;
          scoredMark = normalize(sub.score);
          const maxMark = q.mark !== null && q.mark !== undefined ? Number(q.mark) : null;
          if (maxMark !== null && maxMark > 0) {
            percentage = Number(((Number(sub.score) / maxMark) * 100).toFixed(2));
            grade = calculateGrade(percentage);
          }
        } else {
          status = "Pending Review";
        }
      } else if (q.endDate && new Date(q.endDate) > now) {
        status = "Unsubmitted (Still Open)";
      }

      return {
        id: q.quizId,
        title: q.title,
        fullMark: q.mark,
        scoredMark,
        percentage,
        grade,
        status,
        submissionId: sub ? sub.subId : "N/A",
        hasMarkedPdf,
        feedback: sub ? normalize(sub.feedback) : "N/A"
      };
    });

    logger.info(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Weekly report generated for topic: ${topic.topicId} - ${topic.topicName}`);

    return res.status(200).json({
      status: "success",
      message: "Weekly report generated successfully",
      data: {
        id: topic.topicId,
        topicTitle: topic.topicName,
        studentName: studentData.studentName,
        semester: topic.semester,
        totalSessions: topicSessions,
        sessionsAttended: attendedSessions,
        totalAssignments: assignments.length,
        totalQuizzes: quizzes.length,
        submittedAssignments,
        assignments: assignmentList,
        quizzes: quizList,
        sessions
      }
    });
  } catch (error) {
    logger.error(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Error generating weekly report: ${error.message}`);
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
