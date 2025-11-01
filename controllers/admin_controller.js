const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const bcrypt = require('bcrypt');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const jwt = require("jsonwebtoken");
const Regection = require('../models/rejection_model.js');
const rejection = require('../data_link/admin_data_link');
const Registration = require('../models/registration_model.js');
const registration = require('../data_link/admin_data_link');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const feed = require('../data_link/admin_data_link.js');
const sse = require('../utils/sseClients.js');
const Submission = require('../models/submission_model.js');
const Assignment = require('../models/assignment_model.js');
const Quiz = require('../models/quiz_model.js');
const Topic = require('../models/topic_model.js');
const { Op } = require('sequelize');
const {sanitizeInput}= require('../utils/sanitize.js');


// Assignment.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic' });
// Quiz.belongsTo(Topic, { foreignKey: 'topicId', as: 'topic' });
// Topic.hasMany(Assignment, { foreignKey: 'topicId', as: 'assignments' });
// Topic.hasMany(Quiz, { foreignKey: 'topicId', as: 'quizzes' });


const TARegister = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const { email, name, password, phoneNumber, group} = req.body;
    const groupl=group.toLowerCase();
    await admin.create(email,name,password,phoneNumber,groupl);

    return res.status(201).json({
        status: "success" ,
        data: { message: "Assistant created successfully" }
    });
});

const getPendingCount = asyncWrapper(async (req, res) => {
  const TAGroup = req.admin.group;  
  const students = await admin.findNotVerifiedStudentsByTaGroup(TAGroup);
  return res.status(200).json({
      status: "success",
      message: `Pending registration count`,
      data: { 
        count : students.length
    }})
}
);

const showPendingRegistration = asyncWrapper(async (req, res) => {
  const TAGroup = req.admin.group;
    const students = await admin.findNotVerifiedStudentsByTaGroup(TAGroup);
    return res.status(200).json({
        status: "success",
        message: `Pending registration from students`,
        data: { 
          count : students.length,
          data: students.map(student => ({
            id : student.studentId,
            name: student.studentName,
            email: student.studentEmail,
            group: student.group,
            phoneNumber: student.studentPhoneNumber,
            semester: student.semester
    }))
}})});

const verifyStudent = asyncWrapper(async (req, res) => {
  const student = req.student; // must be set earlier by studentFound
  student.verified = true;
  student.assistantId = req.admin.id; // set the admin who verified
  await student.save();
  await rejection.Destroy( student.studentEmail);
  await registration.registrationDestroy(student.studentEmail);
  return res.status(200).json({ 
    status: "success",
    message: `Student ${student.studentName} verified successfully`,
    data: { studentEmail: student.studentEmail }
  });
});

const showStudentInGroup = asyncWrapper(async (req, res) => {
    const TAGroup = req.admin.group;
    const students = await admin.findVerifiedStudentsByTaGroup(TAGroup);
    return res.status(200).json({
        status: "success",
        message: `Students in group ${TAGroup}`,
        data: { 
  data: students.map(student => ({
      id : student.studentId,
      name: student.studentName,
      email: student.studentEmail,
      banned: student.banned,
    }))
}})});


const removeStudent = asyncWrapper(async (req, res) => {
  const student = req.student; // must be set earlier by studentFound
  await student.destroy();
  return res.status(200).json({
    status: "success",
    message: `Student ${student.studentName} deleted successfully`,
    data: { id : student.studentId,studentEmail: student.studentEmail }
  });
});

const banStudent = asyncWrapper(async (req, res) => {
  const student = req.student; 
  if (student.banned){
    student.banned = false;
    await student.save();
    return res.status(200).json({
      status: "success",
      message: `Student ${student.studentName} unbanned successfully`,
      data: { id : student.studentId, studentEmail: student.studentEmail }
    });
  }else{
    student.banned = true;
    await student.save();
    return res.status(200).json({
      status: "success",
      message: `Student ${student.studentName} banned successfully`,
      data: { id : student.studentId, studentEmail: student.studentEmail }
    });
  }
});



const rejectStudent = asyncWrapper(async (req, res) => {
  const student = req.student; // must be set earlier by studentFound
  const adminId = req.admin.id;
  console.log(adminId) // assuming adminId is available in req.admin
  await rejection.createRejection(student.studentEmail,adminId,student.semester);
  const rej = await registration.findRegistration(student.studentEmail);
  rej.rejectionCount += 1;
  await rej.save();
  const adminCount = await admin.Count(student.group);
  console.log("adminCount : ", adminCount);
  if (rej.rejectionCount >= adminCount) {
    await registration.registrationDestroy(student.studentEmail);
    await student.destroy();
    await rejection.Destroy(student.studentEmail);
  }
  return res.status(200).json({
    status: "success",
    message: `Student ${student.studentName} rejected successfully`,
    data: { id : student.studentId, studentEmail: student.studentEmail }  });
});

const showMyProfile = asyncWrapper(async (req, res) => {
  const adminId = req.admin.id;

  // Fetch admin profile
  const adminProfile = await admin.findAdminById(adminId);
  if (!adminProfile) {
    return res.status(404).json({ status: "Error", data: { message: "Admin not found" } });
  }

  // Fetch verified, not banned students for this admin/assistant
  const myStudents = await student.findAllStudentsForProfile(adminId);

  return res.status(200).json({
    status: "success",
    data: {
      id: adminProfile.adminId,
      adminName: adminProfile.name,
      adminEmail: adminProfile.email,
      phoneNumber: adminProfile.phoneNumber,
      group: adminProfile.group,
      students: myStudents
    }
  });
});


const showStudentProfile= asyncWrapper(async (req, res) => {
  const studentProfile = req.student; // must be set earlier by studentFound
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

const showUnmarkedSubmissions = asyncWrapper(async (req, res) => {
  const adminId = req.admin.id;

  // 🔒 Safely define associations only once (without editing model files)
  if (!Submission.associations.student) {
    Submission.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
  }
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

  // 🎯 "Unmarked" = marked is NULL or empty string
  const unmarkedCondition = {
    [Op.or]: [
      { marked: null },
      { marked: '' }
    ]
  };

  // Build base where clause
  const baseWhere = adminId === 1
    ? unmarkedCondition
    : { ...unmarkedCondition, assistantId: adminId };

    // 🔍 Fetch unmarked assignment submissions
    const assignmentSubs = await Submission.findAll({
      where: { ...baseWhere, type: 'assignment' },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['studentName', 'group']
        },
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['title'],
          include: [
            {
              model: Topic,
              as: 'topic',
              attributes: ['subject']
            }
          ]
        }
      ],
      order: [['subDate', 'DESC']]
    });
    console.log("Assignment Subs: ", assignmentSubs.length);

    // 🔍 Fetch unmarked quiz submissions
    const quizSubs = await Submission.findAll({
      where: { ...baseWhere, type: 'quiz' },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['studentName', 'group']
        },
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['title'],
          include: [
            {
              model: Topic,
              as: 'topic',
              attributes: ['subject']
            }
          ]
        }
      ],
      order: [['subDate', 'DESC']]
    });
    console.log("Quiz Subs: ", quizSubs.length);

    const allSubmissions = [...assignmentSubs, ...quizSubs];
    console.log("All Subs: ", allSubmissions.length);

    if (allSubmissions.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No unmarked submissions found'
      });
    }

    const adminProfile = await admin.findAdminById(adminId);

    const enrichedSubmissions = allSubmissions.map(sub => {
      let content = {};
      let subject = 'N/A';

      if (sub.type === 'assignment' && sub.assignment) {
        content = {
          assignmentId: sub.assId,
          assignmentTitle: sub.assignment.title
        };
        subject = sub.assignment.topic?.subject || 'N/A';
      } else if (sub.type === 'quiz' && sub.quiz) {
        content = {
          quizId: sub.quizId,
          quizTitle: sub.quiz.title
        };
        subject = sub.quiz.topic?.subject || 'N/A';
      }

      return {
        id: sub.subId,
        studentId: sub.studentId,
        studentName: sub.student?.studentName || 'N/A',
        studentGroup: sub.student?.group || 'N/A',
        type: sub.type,
        submittedAt: sub.subDate,
        subject,
        ...content
      };
    });

    // Sort combined list by submission date (newest first)
    enrichedSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    return res.status(200).json({
      status: 'success',
      message: `Unmarked submissions for admin ${adminProfile.name}`,
       data: {
        submissions: enrichedSubmissions
      }
    });

});


const findSubmissionById = asyncWrapper(async (req, res) => {
    const found = req.found;
    return res.status(200).json({
        status: "success",
        data: {found}
    })
})

const showAllSubmissions = asyncWrapper(async (req, res) => {
    const assistantId = req.admin.id;
    const adminProfile = await admin.findAdminById(assistantId);
    console.log(assistantId);
    const submissions = (assistantId === 1
        ? await admin.getAllSubmissions()
        : await admin.getAllSubmissionsById(assistantId));

    if (!submissions || submissions.length === 0) {
        return res.status(200).json({ message: "No unmarked submissions found" });
    }
    return res.status(200).json({
        status: "success",
        message: `Unmarked submissions for admin ${adminProfile.name}`,
        data: {
            submissions: submissions.map(submission => ({
                id: submission.subId,
                studentId: submission.studentId,
                quizId: submission.quizId,
                assignmentId: submission.assId,
                submittedAt: submission.createdAt
            }))
        }
    });

})

const markSubmission = asyncWrapper(async (req, res) => {
    const found = req.found;
    const studentSub = await student.findStudentById(found.studentId)   ;
    const { marked, score } = req.body
    found.score = parseInt(score);
    found.marked = marked;
    found.markedAt = new Date();
    studentSub.totalScore = parseInt (score) + parseInt(studentSub.totalScore);
    await studentSub.save();
    await found.save();
    return res.status(200).json({
        status: "success",
        message: `Submission marked successfully`,
    })
})

module.exports = {
    TARegister,
    showPendingRegistration,
    getPendingCount,
    showStudentInGroup,
    verifyStudent,
    removeStudent,
    banStudent,
    rejectStudent,
    showMyProfile,
    showStudentProfile,
    showUnmarkedSubmissions,
    findSubmissionById,
    showAllSubmissions,
    markSubmission
}

