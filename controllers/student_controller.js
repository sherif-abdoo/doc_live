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
const quizLink= require('../data_link/quiz_data_link.js');
const { notifyAssistants } = require('../utils/sseClients');
const Registration = require('../models/registration_model.js');
const assignment = require('../data_link/assignment_data_link.js');
const submission = require('../data_link/assignment_data_link.js');
const Assignment = require('../models/assignment_model.js');
const { sanitizeInput } = require('../utils/sanitize.js');

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
  const groupl=group.toLowerCase();
  // Create the student
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
  await student.registerStudent(studentEmail, group, semester,studentPhoneNumber);

  // Notify only assistants in the same group
  notifyAssistants(group, {
    event: "student_register",
    message: `New student ${studentName} registered`,
    Student: { id : Student.studentId, studentName, studentEmail, group }
  });

  return res.status(201).json({
    status: "success",
    data: { message: "Student registered successfully" }
  });
});

const showMyAdminProfile = asyncWrapper(async (req, res) => {
  const studentId = req.student.id;
  const found= await student.findStudentById(studentId);
  const adminId= found.assistantId;
  const adminProfile = await admin.findAdminById(adminId);
  return res.status(200).json({
      status: "success",
      data: { 
        id: adminProfile.adminId,
        adminName: adminProfile.name,
        adminEmail: adminProfile.email,
        PhoneNumber: adminProfile.phoneNumber,
        group : adminProfile.group
       }
  });
});

const showMyProfile = asyncWrapper(async (req, res) => {
  const studentId = req.student.id;
  const studentProfile = await student.findStudentById(studentId);
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
        group : studentProfile.group,
        semester: studentProfile.semester,
        totalScore: studentProfile.totalScore
       }
  });
});

const getMyFeed = asyncWrapper(async (req, res, next) => {
    const studentId = req.student.id;
    const studentProfile = await student.findStudentById(studentId);
    const assistantId = studentProfile.assistantId;
    const semester = studentProfile.semester;
    const feeds = await feed.getFeedByAssistantIdAndSemester(assistantId, semester);
    if (!feeds || feeds.length === 0) {
        return next(new AppError("No feed found for your assistant", httpStatus.NOT_FOUND));
    }
    return res.status(200).json({
        status: "success",
        results: feeds.length,
        data: { feeds }
    })
});

const showMySubmission = asyncWrapper(async (req, res) => {
    const studentId = req.student.id;
    const profile = await student.findStudentById(studentId);
    const submissions = await student.showSubmissions(studentId);
    console.log(studentId);
    if (!submissions || submissions.length === 0) {
        return res.status(200).json({ message: "No submissions found" });
    }
    return res.status(200).json({
        status: "success",
        message: `submissions for student ${profile.studentName}`,
        data: {
            submissions: submissions.map(submission => ({
                id: submission.subId,
                assistantId: submission.assistantId,
                quizId: submission.quizId,
                assignmentId: submission.assId,
                submittedAt: submission.createdAt,
                score: submission.score,
            }))
        }
    });
})

const showASubmission = asyncWrapper(async (req, res) => {
    const found = req.found;
    return res.status(200).json({
        status: "success",
        data: {id : found.subId,
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
  const taName = await admin.getAdminNameById(found.assistantId);
  console.log(taName.name);
  return res.status(200).json({
      status: "success",
      data: {id : found.subId,
        assistant: taName.name,
        assId : found.assistantId,
        score: found.score,
        markedPdf : found.marked,
        markedAt : found.markedAt,
        feedback : found.feedback
      }
  })
});

// Student quiz trend: per-quiz points grouped by week, for line chart
const getQuizTrend = asyncWrapper(async (req, res) => {
  const { from, to } = req.query; // optional ISO dates
  const { Op } = require('sequelize');
  const Submission = require('../models/submission_model');
  const studentId = req.student.id;
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  // get student's group to pull all quizzes for that group
  const me = await student.findStudentById(studentId);
  const allQuizzes = await quizLink.getAllQuizzesForGroup(me.group);
  const quizzes = allQuizzes
    .filter(q => (fromDate ? new Date(q.date) >= fromDate : true))
    .filter(q => (toDate ? new Date(q.date) <= toDate : true))
    .map(q => ({ quizId: q.quizId, date: q.date, totalMark: q.mark }))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  const quizIds = quizzes.map(q => q.quizId);
  const subs = quizIds.length ? await Submission.findAll({ where: { studentId, type: 'quiz', quizId: { [Op.in]: quizIds } }, raw: true }) : [];
  const subMap = new Map(subs.map(s => [s.quizId, s]));

 // Build one point per quiz; if no submission or score 0 -> percentage 0
  const points = quizzes
    .map((q, idx) => {
      const when = new Date(q.date);
      const week = idx + 1; // sequential week index based on date order
      const sub = subMap.get(q.quizId);
      const score = sub && typeof sub.score === 'number' ? sub.score : 0;
      const totalMark = typeof q.totalMark === 'number' && q.totalMark > 0 ? q.totalMark : null;
      return { quizId: q.quizId, date: when, week, score, totalMark: q.totalMark };
    })
    ;

  // For chart: y-axis = Week, x-axis= Row grade
  const chartPoints = points.map(p => ({ y: p.week, x: p.score, quizId: p.quizId, date: p.date }));

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