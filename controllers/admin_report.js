const { Op } = require('sequelize');
const Student = require('../models/student_model');
const student = require('../data_link/student_data_link.js');
const Assignment = require('../models/assignment_model');
const Quiz = require('../models/quiz_model');
const Submission = require('../models/submission_model');
const Topic = require('../models/topic_model');
const topicDl = require('../data_link/topic_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const Session = require('../models/session_model');
const Attendance = require('../models/attendance_model');
const sessionDl = require('../data_link/session_data_link.js');
const logger = require('../utils/logger');

const getGradingSystem = () => {
  return {
    calculateGrade: (percentage) => {
      if (percentage >= 80) return 'A*';
      if (percentage >= 70) return 'A';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C';
      return 'U';
    }
  };
};

const createReport = async (req, res) => {
  sanitizeInput(req.params);
  const { topicId } = req.params;

  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Requesting report for topicId: ${topicId}`);

  // 🔒 Authorization
  if (!req.admin || req.admin.type !== 'admin') {
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Access denied - not an assistant`);
    return res.status(403).json({ error: 'Access denied. Assistants only.' });
  }

  const assistantId = req.admin.id;

  // 🔍 Validate topic
  const topic = await topicDl.getTopicById(topicId);
  if (!topic) {
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Topic not found: ${topicId}`);
    return res.status(404).json({ error: 'Topic not found or not owned by this assistant.' });
  }
  if (topic.group !== req.admin.group && req.admin.group !== 'all' && topic.group !== 'all') {
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Unauthorized access to topic: ${topicId}, topic group: ${topic.group}`);
    return res.status(403).json({ error: 'You are not authorized to access this topic.' });
  }

  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Topic found: ${topic.topicName}, group: ${topic.group}`);

  const topicSessions = await sessionDl.countTotalSessionsByTopic(topic.topicId);
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Total sessions for topic: ${topicSessions}`);

  // 👥 Get students
  let students = [];
  if (req.admin.group === 'all') {
    students = await Student.findAll({});
  } else {
    students = await student.getStudentsByAssistant(assistantId);
  }
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Students loaded: ${students.length}`);

  // Fetch assignments
  const assignments = await Assignment.findAll({
    where: { topicId: topic.topicId },
    attributes: ['assignId', 'title', 'mark']
  });
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Assignments for topic: ${assignments.length}`);

  const quizzes = await Quiz.findOne({
    where: { topicId: topic.topicId },
    attributes: ['quizId', 'mark', 'title']
  });
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Quiz found: ${quizzes ? quizzes.title : 'none'}`);

  const quizTotalScore = quizzes?.mark ?? 0;
  const numberOfAssignments = assignments.length;

  const studentIds = students.map(s => s.studentId);

  // 📤 Build submission query
  let submissionConditions = [];
  const assignmentIds = assignments.map(a => a.assignId);
  if (assignmentIds.length > 0) {
    submissionConditions.push({
      type: 'assignment',
      assId: { [Op.in]: assignmentIds },
      studentId: { [Op.in]: studentIds }
    });
  }
  if (quizzes) {
    submissionConditions.push({
      type: 'quiz',
      quizId: quizzes.quizId,
      studentId: { [Op.in]: studentIds }
    });
  }

  let submissions = [];
  if (submissionConditions.length > 0) {
    submissions = await Submission.findAll({
      where: { [Op.or]: submissionConditions },
      attributes: ['studentId', 'type', 'assId', 'quizId', 'score']
    });
  }
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Submissions loaded: ${submissions.length}`);

  // 🗂️ Build lookup map
  const submissionsMap = {};
  submissions.forEach(sub => {
    if (sub.type === 'assignment') {
      submissionsMap[`A-${sub.studentId}-${sub.assId}`] = sub.score;
    } else if (sub.type === 'quiz') {
      submissionsMap[`Q-${sub.studentId}`] = sub.score;
    }
  });

  const grading = getGradingSystem();

  const studentReports = await Promise.all(students.map(async (st) => {
    const quizScore = submissionsMap[`Q-${st.studentId}`];
    let percentage = 'missing';
    let grade = 'missing';
    if (quizScore != null && quizTotalScore > 0) {
      percentage = parseFloat(((quizScore / quizTotalScore) * 100).toFixed(2));
      grade = grading.calculateGrade(percentage);
    }

    const attendedSessions = await sessionDl.countAttendedSessionsByTopic(st.studentId, topic.topicId);

    const assignmentList = assignments.map(ass => ({
      id: ass.assignId,
      title: ass.title,
      status: submissionsMap[`A-${st.studentId}-${ass.assignId}`] != null ? "done" : "missing"
    }));

    return {
      id: st.studentId,
      email: st.studentEmail,
      studentName: st.studentName,
      banned: st.banned,
      quizScore: quizScore ?? 'missing',
      percentage,
      grade,
      attended: attendedSessions,
      assignments: assignmentList
    };
  }));

  logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Report generated for topic: ${topic.topicName}, students: ${studentReports.length}`);

  return res.json({
    topicId: topic.topicId,
    topicName: topic.topicName,
    quizTitle: quizzes?.title ?? 'No quiz',
    quizTotalScore,
    numberOfAssignments,
    totalSession: topicSessions,
    students: studentReports
  });
};

module.exports = { createReport };
