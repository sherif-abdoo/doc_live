const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const Quiz = require('../models/quiz_model.js');
const Assignment = require('../models/assignment_model.js');
const Submission = require('../models/submission_model.js');
const Session = require('../models/session_model.js');
const Attendance = require('../models/attendance_model.js');
const Feed = require('../models/feed_model.js');
const Registration = require('../models/registration_model.js');
const admins = require('../data_link/admin_data_link');
const bcrypt = require('bcrypt');
const AppError = require('../utils/app.error');
const materialDl = require('../data_link/material_data_link.js');
const sessionDl = require('../data_link/session_data_link.js');
const submissionDl = require('../data_link/submission_data_link.js');
const assignmentDl = require('../data_link/assignment_data_link.js');
const topicDl = require('../data_link/topic_data_link.js');
const studentDl = require('../data_link/student_data_link.js');
const quizDl = require('../data_link/quiz_data_link.js');
const otpDl = require('../data_link/forget_password.js');
const asyncWrapper = require('../middleware/asyncwrapper');
const Group = require('../models/group_model.js');
const {sanitizeInput} = require('../utils/sanitize.js');

const DOK_signUp= asyncWrapper( async (req, res) => {
    sanitizeInput(req.body);
    const { email, name, password, phoneNumber, role = "teacher", permission = "all" } = req.body;

    // hash password
    const encryptedPassword = await bcrypt.hash(String(password), 10);

    // create admin
    await Admin.create({
      adminId: 1,
      email,
      name,
      password: encryptedPassword,
      phoneNumber: phoneNumber,
      group: "all", // matches model field
      role,
      permission,
      verified: true,
    });
    return res.status(201).json({
      status: "success" ,
      data: { message: "Teacher created successfully" }
    });
})

const rejectAssistant = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { email } = req.params;
    const assistant = await admins.findAdminByEmail(email);
    await admins.removeAssistant( email  );
    return res.status(200).json({
    status: "success",
    message: `Assistant with email ${email} rejected and removed from database`
  });
});

const acceptAssistant = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { email } = req.params;
    await admins.verifyAssistant( email );
    return res.status(200).json({
        status: "success",
        message: `Assistant with email ${email} accepted`
    });
})

const showPendingRegistration = asyncWrapper(async (req, res) => {
    const admin = await admins.showPendingAdminRegistration();
    return res.status(200).json({
        status: "success",
        message: `Pending registration from assistants`,
        data: { 
  data: admin.map(admin => ({
      name: admin.name,
      email: admin.email,
      group: admin.group
    }))
}})})

const removeAssistant = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { email } = req.params;
    const deleted = await admins.removeAssistant(email);
    return res.status(200).json({
        status: "success",
        message: `Assistant with email ${email} removed successfully`
    })
})

const checkAssistantGroup = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { group } = req.params;
    const admin = await admins.checkAssistantGroup( group );
    return res.status(200).json({
        status: "success",
        data: {
            data: admin.map(admin => ({
                name: admin.name,
                email: admin.email
            }))
        }
    });
});

const assignGroupToAssistant = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    sanitizeInput(req.params);
    const { id } = req.params;
    const { group } = req.body;
    const assistant = await admins.findAdminById(id);
    if (!assistant) {
        return next(new AppError('Assistant not found', 404));
    }
    assistant.group = group;
    await assistant.save();
    return res.status(200).json({
        status: "success",
        message: `Group ${group} assigned to assistant ${assistant.name} successfully`
    });
});

const createNewGroup = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const { groupName } = req.body;
    const groupl=groupName.toLowerCase();
    const existingGroup = await Group.findOne({ where: { groupName:  groupl } });
    if (existingGroup) {
        return next(new AppError('Group name already exists', 400));
    }
    const newGroup = await Group.create({groupName : groupl });
    return res.status(201).json({
        status: "success",
        message: `Group ${groupName} created successfully`,
        data: {
            groupId: newGroup.groupId,
            groupName: newGroup.groupName
        }
    });
});

const deleteSemester = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const { semester } = req.body;
    await materialDl.deleteMaterialBySemester(semester);
    console.log("Deleted materials for semester:", semester);
    await sessionDl.deleteAttendanceBySemester(semester);
    console.log("Deleted attendance for semester:", semester);
    await sessionDl.deleteSessionsBySemester(semester);
    console.log("Deleted sessions for semester:", semester);
    await submissionDl.deleteSubmissionBySemester(semester);
    console.log("Deleted submissions for semester:", semester);
    await assignmentDl.deleteAssignmentBySemester(semester);
    console.log("Deleted assignments for semester:", semester);
    await quizDl.deleteQuizBySemester(semester);
    console.log("Deleted quizzes for semester:", semester);
    await topicDl.deleteTopicBySemester(semester);
    console.log("Deleted topics for semester:", semester);
    await studentDl.deleteRejectionsBySemester(semester);
    console.log("Deleted rejections for semester:", semester);
    await studentDl.deleteRegistrationBySemester(semester);
    console.log("Deleted registrations for semester:", semester);
    await otpDl.deleteOtpBySemester(semester);
    console.log("Deleted OTPs for semester:", semester);
    await studentDl.deleteStudentBySemester(semester);
    console.log("Deleted students for semester:", semester);
    return res.status(200).json({
        status: "success",
        message: `All data for semester ${semester} deleted successfully`
    });
});

module.exports = {
    DOK_signUp, 
    rejectAssistant,
    acceptAssistant,
    showPendingRegistration,
    removeAssistant,
    checkAssistantGroup,
    assignGroupToAssistant,
    createNewGroup,
    deleteSemester
}