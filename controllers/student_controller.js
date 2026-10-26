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
const quizLink = require('../data_link/quiz_data_link.js');
const { notifyAssistants } = require('../utils/sseClients');
const Registration = require('../models/registration_model.js');
const assignment = require('../data_link/assignment_data_link.js');
const submission = require('../data_link/assignment_data_link.js');
const Assignment = require('../models/assignment_model.js');
const Submission = require('../models/submission_model.js');
const Quiz = require('../models/quiz_model.js');
const Topic = require('../models/topic_model.js');
const { Op } = require('sequelize');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger');

const studentRegister = asyncWrapper(async (req, res) => {
  sanitizeInput(req.body);
  const {
    studentEmail,
    studentName,
    password,
    studentPhoneNumber,
    parentPhoneNumber,
    parentEmail,
    birthDate,
    group,
    semester
  } = req.body;
  const groupl = group.toLowerCase();
  logger.debug(`[student : ${studentEmail} | ${studentName} | ${groupl}] Registering student, semester: ${semester}`);
  await student.createStudent(
    studentName,
    studentEmail,
    password,
    parentEmail,
    birthDate,
    studentPhoneNumber,
    parentPhoneNumber,
    groupl,
    semester
  );
  await student.registerStudent(studentEmail, group, semester, studentPhoneNumber);

  notifyAssistants(group, {
    event: "student_register",
    message: `New student ${studentName} registered`,
    Student: { id: Student.studentId, studentName, studentEmail, group }
  });

  logger.info(`[student : ${studentEmail} | ${studentName} | ${groupl}] Registered successfully`);
  return res.status(201).json({
    status: "success",
    data: { message: "Student registered successfully" }
  });
});

const showMyAdminProfile = asyncWrapper(async (req, res) => {
  const studentId = req.student.id;
  const found = await student.findStudentById(studentId);
  logger.debug(`[student : ${req.student.email} | ${found.studentName} | ${found.group}] Fetching admin profile for studentId: ${studentId}`);
  const adminId = found.assistantId;
  const adminProfile = await admin.findAdminById(adminId);
  logger.info(`[student : ${req.student.email} | ${found.studentName} | ${found.group}] Admin profile fetched: ${adminProfile.email}`);
  return res.status(200).json({
    status: "success",
    data: {
      id: adminProfile.adminId,
      adminName: adminProfile.name,
      adminEmail: adminProfile.email,
      PhoneNumber: adminProfile.phoneNumber,
      group: adminProfile.group
    }
  });
});

const showMyProfile = asyncWrapper(async (req, res) => {
  const studentId = req.student.id;
  const studentProfile = await student.findStudentById(studentId);
  logger.debug(`[student : ${req.student.email} | ${studentProfile.studentName} | ${studentProfile.group}] Fetching profile for studentId: ${studentId}`);
  logger.info(`[student : ${req.student.email} | ${studentProfile.studentName} | ${studentProfile.group}] Profile fetched successfully`);
  return res.status(200).json({
    status: "success",
    data: {
      id: studentProfile.studentId,
      studentName: studentProfile.studentName,
      studentEmail: studentProfile.studentEmail,
      birthDate: studentProfile.birthDate,
      studentPhoneNumber: studentProfile.studentPhoneNumber,
      parentPhoneNumber: studentProfile.parentPhoneNumber,
      parentEmail: studentProfile.parentEmail,
      group: studentProfile.group,
      semester: studentProfile.semester,
      totalScore: studentProfile.totalScore
    }
  });
});

const getMyFeed = asyncWrapper(async (req, res, next) => {
  const studentId = req.student.id;
  const studentProfile = await student.findStudentById(studentId);
  logger.debug(`[student : ${req.student.email} | ${studentProfile.studentName} | ${studentProfile.group}] Fetching feed for studentId: ${studentId}`);
  const assistantId = studentProfile.assistantId;
  const semester = studentProfile.semester;
  const feeds = await feed.getFeedByAssistantIdAndSemester(assistantId, semester);
  if (!feeds || feeds.length === 0) {
    logger.info(`[student : ${req.student.email} | ${studentProfile.studentName} | ${studentProfile.group}] No feed found`);
    return next(new AppError("No feed found for your assistant", httpStatus.NOT_FOUND));
  }
  logger.info(`[student : ${req.student.email} | ${studentProfile.studentName} | ${studentProfile.group}] Feed fetched, count: ${feeds.length}`);
  return res.status(200).json({
    status: "success",
    results: feeds.length,
    data: { feeds }
  })
});

const showMySubmission = asyncWrapper(async (req, res) => {
  const studentId = req.student.id;
  const profile = await student.findStudentById(studentId);
  logger.debug(`[student : ${req.student.email} | ${profile.studentName} | ${profile.group}] Fetching submissions for studentId: ${studentId}`);

  if (!Submission.associations.assignment) {
    Submission.belongsTo(Assignment, { foreignKey: 'assId', as: 'assignment' });
  }
  if (!Submission.associations.quiz) {
    Submission.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });
  }
  if (!Assignment.associations.topic) {
    Assignment.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic' });
  }
  if (!Quiz.associations.topic) {
    Quiz.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic' });
  }

  const assignmentSubs = await Submission.findAll({
    where: { studentId, type: 'assignment' },
    include: [
      {
        model: Assignment,
        as: 'assignment',
        attributes: ['title'],
        include: [{ model: Topic, as: 'topic', attributes: ['subject'] }]
      }
    ],
    order: [['subDate', 'DESC']]
  });

  const quizSubs = await Submission.findAll({
    where: { studentId, type: 'quiz' },
    include: [
      {
        model: Quiz,
        as: 'quiz',
        attributes: ['title'],
        include: [{ model: Topic, as: 'topic', attributes: ['subject'] }]
      }
    ],
    order: [['subDate', 'DESC']]
  });

  const allSubmissions = [...assignmentSubs, ...quizSubs];

  if (allSubmissions.length === 0) {
    return res.status(200).json({ message: "No submissions found" });
  }

  const enriched = allSubmissions.map(sub => {
    let name = 'N/A';
    let subject = 'N/A';

    if (sub.type === 'assignment' && sub.assignment) {
      name = sub.assignment.title;
      subject = sub.assignment.topic?.subject || 'N/A';
    } else if (sub.type === 'quiz' && sub.quiz) {
      name = sub.quiz.title;
      subject = sub.quiz.topic?.subject || 'N/A';
    }

    return {
      id: sub.subId,
      type: sub.type,
      name,
      subject,
      assistantId: sub.assistantId,
      quizId: sub.quizId,
      assignmentId: sub.assId,
      submittedAt: sub.subDate,
      score: sub.score
    };
  });

  enriched.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  logger.info(`[student : ${req.student.email} | ${profile.studentName} | ${profile.group}] Submissions fetched, count: ${enriched.length}`);
  return res.status(200).json({
    status: "success",
    message: `Submissions for student ${profile.studentName}`,
    data: { submissions: enriched }
  });
})

const showASubmission = asyncWrapper(async (req, res) => {
  const found = req.found;
  return res.status(200).json({
    status: "success",
    data: {
      id: found.subId,
      score: found.score,
      answers: found.answers,
      subDate: found.subDate,
      studentId: found.studentId,
      assistantId: found.assistantId,
      type: found.type,
      semester: found.semester,
      quizId: found.quizId,
      assId: found.assId,
      markedAt: found.markedAt,
    }
  })
})

const getMarkForSubmission = asyncWrapper(async (req, res) => {
  const found = req.found;
  logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Fetching mark for submissionId: ${found.subId}`);
  const taName = await admin.getAdminNameById(found.assistantId);
  logger.info(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Mark fetched for submissionId: ${found.subId}, score: ${found.score}`);
  return res.status(200).json({
    status: "success",
    data: {
      id: found.subId,
      assistant: taName.name,
      assId: found.assistantId,
      score: found.score,
      markedPdf: found.marked,
      markedAt: found.markedAt,
      feedback: found.feedback
    }
  })
});

const getQuizTrend = asyncWrapper(async (req, res) => {
  const { from, to } = req.query;
  const { Op } = require('sequelize');
  const Submission = require('../models/submission_model');
  const studentId = req.student.id;
  logger.debug(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Fetching quiz trend, from: ${from}, to: ${to}`);
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const me = await student.findStudentById(studentId);
  const allQuizzes = await quizLink.getAllQuizzesForGroup(me.group);
  const quizzes = allQuizzes
    .filter(q => (fromDate ? new Date(q.date) >= fromDate : true))
    .filter(q => (toDate ? new Date(q.date) <= toDate : true))
    .map(q => ({ quizId: q.quizId, date: q.date, totalMark: q.mark }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const quizIds = quizzes.map(q => q.quizId);
  const subs = quizIds.length ? await Submission.findAll({ where: { studentId, type: 'quiz', quizId: { [Op.in]: quizIds } }, raw: true }) : [];
  const subMap = new Map(subs.map(s => [s.quizId, s]));

  const points = quizzes.map((q, idx) => {
    const when = new Date(q.date);
    const week = idx + 1;
    const sub = subMap.get(q.quizId);
    const score = sub && typeof sub.score === 'number' ? sub.score : 0;
    const totalMark = typeof q.totalMark === 'number' && q.totalMark > 0 ? q.totalMark : null;
    return { quizId: q.quizId, date: when, week, score, totalMark: q.totalMark };
  });

  const chartPoints = points.map(p => ({ y: p.week, x: p.score, quizId: p.quizId, date: p.date }));

  logger.info(`[student : ${req.student.email} | ${req.student.name} | ${req.student.group}] Quiz trend fetched, points: ${points.length}`);
  return res.status(200).json({ status: 'success', data: { points, chartPoints } });
})


module.exports = {
  studentRegister,
  showMyAdminProfile,
  showMyProfile,
  getMyFeed,
  showMySubmission,
  showASubmission,
  getQuizTrend,
  getMarkForSubmission
}
