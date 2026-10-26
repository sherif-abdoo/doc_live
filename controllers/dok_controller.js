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
const { changeGroupName, deleteGroupName } = require('../data_link/group_data_link');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger');

const DOK_signUp = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const { email, name, password, phoneNumber, role = "teacher", permission = "all" } = req.body;
    logger.debug(`[system] DOK superadmin signup attempt for email: ${email}, name: ${name}`);
    const encryptedPassword = await bcrypt.hash(String(password), 10);
    await Admin.create({
        adminId: 1,
        email,
        name,
        password: encryptedPassword,
        phoneNumber,
        group: "all",
        role,
        permission,
        verified: true,
    });
    logger.info(`[system] DOK superadmin created successfully: ${email}, name: ${name}`);
    return res.status(201).json({
        status: "success",
        data: { message: "Teacher created successfully" }
    });
});

const rejectAssistant = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { email } = req.params;
    logger.debug(`[DOK] Rejecting assistant: ${email}`);
    await admins.removeAssistant(email);
    logger.info(`[DOK] Assistant rejected and removed: ${email}`);
    return res.status(200).json({
        status: "success",
        message: `Assistant with email ${email} rejected and removed from database`
    });
});

const acceptAssistant = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { email } = req.params;
    logger.debug(`[DOK] Accepting assistant: ${email}`);
    await admins.verifyAssistant(email);
    logger.info(`[DOK] Assistant accepted and verified: ${email}`);
    return res.status(200).json({
        status: "success",
        message: `Assistant with email ${email} accepted`
    });
});

const showPendingRegistration = asyncWrapper(async (req, res) => {
    logger.debug(`[DOK] Fetching pending assistant registrations`);
    const admin = await admins.showPendingAdminRegistration();
    logger.info(`[DOK] Pending assistant registrations fetched, count: ${admin.length}`);
    return res.status(200).json({
        status: "success",
        message: `Pending registration from assistants`,
        data: {
            data: admin.map(admin => ({
                name: admin.name,
                email: admin.email,
                group: admin.group,
                phoneNumber: admin.phoneNumber
            }))
        }
    });
});

const removeAssistant = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { email } = req.params;
    logger.debug(`[DOK] Removing assistant: ${email}`);
    await admins.removeAssistant(email);
    logger.info(`[DOK] Assistant removed successfully: ${email}`);
    return res.status(200).json({
        status: "success",
        message: `Assistant with email ${email} removed successfully`
    });
});

const checkAssistantGroup = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { group } = req.params;
    logger.debug(`[DOK] Checking assistants in group: ${group}`);
    const admin = await admins.checkAssistantGroup(group);
    logger.info(`[DOK] Assistants found in group ${group}: ${admin.length}`);
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
    logger.debug(`[DOK] Assigning group ${group} to assistant id: ${id}`);
    const assistant = await admins.findAdminById(id);
    if (!assistant) {
        logger.info(`[DOK] Assistant not found, id: ${id}`);
        return res.status(404).json({ status: "Error", data: { message: "Assistant not found" } });
    }
    assistant.group = group;
    await assistant.save();
    logger.info(`[DOK] Group ${group} assigned to assistant: ${assistant.name} (${assistant.email})`);
    return res.status(200).json({
        status: "success",
        message: `Group ${group} assigned to assistant ${assistant.name} successfully`
    });
});

const createNewGroup = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const { groupName } = req.body;
    const groupl = groupName.toLowerCase();
    logger.debug(`[DOK] Creating new group: ${groupl}`);
    const existingGroup = await Group.findOne({ where: { groupName: groupl } });
    if (existingGroup) {
        logger.info(`[DOK] Group already exists, cannot create: ${groupl}`);
        return res.status(400).json({ status: "Error", data: { message: "Group name already exists" } });
    }
    const newGroup = await Group.create({ groupName: groupl });
    logger.info(`[DOK] Group created successfully: ${groupl}, id: ${newGroup.groupId}`);
    return res.status(201).json({
        status: "success",
        message: `Group ${groupName} created successfully`,
        data: { groupId: newGroup.groupId, groupName: newGroup.groupName }
    });
});

const editGroup = asyncWrapper(async (req, res) => {
    const { groupName, newName } = req.body;
    const groupl = groupName.toLowerCase();
    logger.debug(`[DOK] Attempting to rename group: ${groupl} -> ${newName}`);
    const existingGroup = await Group.findOne({ where: { groupName: groupl } });
    if (!existingGroup) {
        logger.info(`[DOK] Group does not exist, cannot rename: ${groupl}`);
        return res.status(400).json({ status: "Error", data: { message: "Group name does not exist" } });
    }
    const newl = newName.toLowerCase();
    const newG = await Group.findOne({ where: { groupName: newl } });
    if (newG) {
        logger.info(`[DOK] Target group name already exists: ${newl}`);
        return res.status(400).json({ status: "Error", data: { message: "New group name already exists" } });
    }
    await changeGroupName(groupName, newName);
    logger.info(`[DOK] Group renamed: ${groupl} -> ${newl}`);
    return res.status(200).json({
        status: "success",
        message: `group ${groupName} changed to ${newName}`
    });
});

const deleteGroup = asyncWrapper(async (req, res) => {
    const { groupName } = req.body;
    const groupl = groupName.toLowerCase();
    logger.debug(`[DOK] Attempting to delete group: ${groupl}`);
    const existingGroup = await Group.findOne({ where: { groupName: groupl } });
    if (!existingGroup) {
        logger.info(`[DOK] Group does not exist, cannot delete: ${groupl}`);
        return res.status(400).json({ status: "Error", data: { message: "Group name does not exist" } });
    }
    await deleteGroupName(groupName);
    logger.info(`[DOK] Group deleted successfully: ${groupl}`);
    return res.status(200).json({
        status: "success",
        message: `Group ${groupName} deleted successfully`
    });
});

const resetScore = asyncWrapper(async (req, res) => {
    logger.debug(`[DOK] Resetting total score for all students`);
    await studentDl.resetTotalScore();
    logger.info(`[DOK] Total score reset to zero for all students`);
    return res.status(200).json({
        status: "success",
        message: "Total score reset to zero for all students"
    });
});

const deleteSemester = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const { semester } = req.body;
    logger.debug(`[DOK] Starting semester deletion for: ${semester}`);

    await materialDl.deleteMaterialBySemester(semester);
    logger.debug(`[DOK] Deleted materials for semester: ${semester}`);
    await sessionDl.deleteAttendanceBySemester(semester);
    logger.debug(`[DOK] Deleted attendance for semester: ${semester}`);
    await sessionDl.deleteSessionsBySemester(semester);
    logger.debug(`[DOK] Deleted sessions for semester: ${semester}`);
    await submissionDl.deleteSubmissionBySemester(semester);
    logger.debug(`[DOK] Deleted submissions for semester: ${semester}`);
    await assignmentDl.deleteAssignmentBySemester(semester);
    logger.debug(`[DOK] Deleted assignments for semester: ${semester}`);
    await quizDl.deleteQuizBySemester(semester);
    logger.debug(`[DOK] Deleted quizzes for semester: ${semester}`);
    await topicDl.deleteTopicBySemester(semester);
    logger.debug(`[DOK] Deleted topics for semester: ${semester}`);
    await studentDl.deleteRejectionsBySemester(semester);
    logger.debug(`[DOK] Deleted rejections for semester: ${semester}`);
    await studentDl.deleteRegistrationBySemester(semester);
    logger.debug(`[DOK] Deleted registrations for semester: ${semester}`);
    await otpDl.deleteOtpBySemester(semester);
    logger.debug(`[DOK] Deleted OTPs for semester: ${semester}`);
    await studentDl.deleteStudentBySemester(semester);
    logger.debug(`[DOK] Deleted students for semester: ${semester}`);

    logger.info(`[DOK] All data for semester ${semester} deleted successfully`);
    return res.status(200).json({
        status: "success",
        message: `All data for semester ${semester} deleted successfully`
    });
});

const DOKStudentsDashboard = asyncWrapper(async (req, res) => {
    logger.debug(`[DOK] Fetching students dashboard`);
    const students = await studentDl.getStudentForDok();
    const totalGroups = [...new Set(students.map(student => student.group))].length;
    logger.info(`[DOK] Students dashboard loaded, totalStudents: ${students.length}, totalGroups: ${totalGroups}`);
    return res.status(200).json({
        status: "success",
        data: {
            totalStudents: students.length,
            totalGroups,
            students
        }
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
    editGroup,
    deleteGroup,
    deleteSemester,
    resetScore,
    DOKStudentsDashboard
}
