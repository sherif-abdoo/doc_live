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

  if (!req.admin || req.admin.type !== 'admin') {
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Access denied - not an assistant`);
    return res.status(403).json({ error: 'Access denied. Assistants only.' });
  }

  const assistantId = req.admin.id;

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

  let students = [];
  if (req.admin.group === 'all') {
    students = await Student.findAll({});
  } else {
    students = await student.getStudentsByAssistant(assistantId);
  }
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Students loaded: ${students.length}`);

  const assignments = await Assignment.findAll({
    where: { topicId: topic.topicId },
    attributes: ['assignId', 'title', 'mark']
  });
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Assignments for topic: ${assignments.length}`);

  const quizzes = await Quiz.findAll({
    where: { topicId: topic.topicId },
    attributes: ['quizId', 'mark', 'title']
  });
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Quizzes for topic: ${quizzes.length}`);

  const numberOfAssignments = assignments.length;
  const numberOfQuizzes = quizzes.length;
  const studentIds = students.map(s => s.studentId);
  const assignmentIds = assignments.map(a => a.assignId);
  const quizIds = quizzes.map(q => q.quizId);

  // Build submission query covering all assignments and all quizzes
  let submissionConditions = [];
  if (assignmentIds.length > 0) {
    submissionConditions.push({
      type: 'assignment',
      assId: { [Op.in]: assignmentIds },
      studentId: { [Op.in]: studentIds }
    });
  }
  if (quizIds.length > 0) {
    submissionConditions.push({
      type: 'quiz',
      quizId: { [Op.in]: quizIds },
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

  // Build lookup map keyed by A-studentId-assignId and Q-studentId-quizId
  const submissionsMap = {};
  submissions.forEach(sub => {
    if (sub.type === 'assignment') {
      submissionsMap[`A-${sub.studentId}-${sub.assId}`] = sub.score;
    } else if (sub.type === 'quiz') {
      submissionsMap[`Q-${sub.studentId}-${sub.quizId}`] = sub.score;
    }
  });

  const grading = getGradingSystem();

  const studentReports = await Promise.all(students.map(async (st) => {
    const attendedSessions = await sessionDl.countAttendedSessionsByTopic(st.studentId, topic.topicId);

    const assignmentList = assignments.map(ass => ({
      id: ass.assignId,
      title: ass.title,
      fullMark: ass.mark,
      scoredMark: submissionsMap[`A-${st.studentId}-${ass.assignId}`] ?? 'missing'
    }));

    const quizList = quizzes.map(q => {
      const scoredMark = submissionsMap[`Q-${st.studentId}-${q.quizId}`] ?? null;
      let percentage = 'missing';
      let grade = 'missing';
      if (scoredMark !== null && q.mark > 0) {
        percentage = parseFloat(((scoredMark / q.mark) * 100).toFixed(2));
        grade = grading.calculateGrade(percentage);
      }
      return {
        id: q.quizId,
        title: q.title,
        fullMark: q.mark,
        scoredMark: scoredMark ?? 'missing',
        percentage,
        grade
      };
    });

    return {
      id: st.studentId,
      email: st.studentEmail,
      studentName: st.studentName,
      banned: st.banned,
      attended: attendedSessions,
      assignments: assignmentList,
      quizzes: quizList
    };
  }));

  logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Report generated for topic: ${topic.topicName}, students: ${studentReports.length}`);

  return res.json({
    topicId: topic.topicId,
    topicName: topic.topicName,
    numberOfAssignments,
    numberOfQuizzes,
    totalSession: topicSessions,
    students: studentReports
  });
};

module.exports = { createReport };
