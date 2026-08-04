const Admin = require('../models/admin_model');
const Assignment = require('../models/assignment_model');
const Attendance = require('../models/attendance_model');
const Feed = require('../models/feed_model');
const Group = require('../models/group_model');
const Material = require('../models/material_model');
const Quiz = require('../models/quiz_model');
const Registration = require('../models/registration_model');
const Rejection = require('../models/rejection_model');
const Session = require('../models/session_model');
const Student = require('../models/student_model');
const Submission = require('../models/submission_model');
const Topic = require('../models/topic_model');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

async function changeGroupName(groupName, newName) {
    const [groupResult, adminResult, studentResult, sessionResult, topicResult, registrationResult] = await Promise.all([
        Group.update({ groupName: newName }, { where: { groupName } }),
        Admin.update({ group: newName }, { where: { group: groupName } }),
        Student.update({ group: newName }, { where: { group: groupName } }),
        Session.update({ group: newName }, { where: { group: groupName } }),
        Topic.update({ group: newName }, { where: { group: groupName } }),
        Registration.update({ group: newName }, { where: { group: groupName } }),
    ]);

    logger.db(`Group table updated: ${groupName} → ${newName}, rows: ${groupResult[0]}`);
    logger.db(`Admin table updated: group ${groupName} → ${newName}, rows: ${adminResult[0]}`);
    logger.db(`Student table updated: group ${groupName} → ${newName}, rows: ${studentResult[0]}`);
    logger.db(`Session table updated: group ${groupName} → ${newName}, rows: ${sessionResult[0]}`);
    logger.db(`Topic table updated: group ${groupName} → ${newName}, rows: ${topicResult[0]}`);
    logger.db(`Registration table updated: group ${groupName} → ${newName}, rows: ${registrationResult[0]}`);
}

async function deleteGroupName(groupName) {
    // 1. Get all admins in this group
    const admins = await Admin.findAll({ where: { group: groupName }, attributes: ['adminId'] });
    const adminIds = admins.map(a => a.adminId);
    logger.db(`[deleteGroup: ${groupName}] Found ${adminIds.length} admins`);

    // 2. Get all students in this group
    const students = await Student.findAll({ where: { group: groupName }, attributes: ['studentId', 'studentEmail'] });
    const studentIds = students.map(s => s.studentId);
    const studentEmails = students.map(s => s.studentEmail);
    logger.db(`[deleteGroup: ${groupName}] Found ${studentIds.length} students`);

    // 3. Get all topics in this group
    const topics = await Topic.findAll({ where: { group: groupName }, attributes: ['topicId'] });
    const topicIds = topics.map(t => t.topicId);
    logger.db(`[deleteGroup: ${groupName}] Found ${topicIds.length} topics`);

    // 4. Get all sessions in this group
    const sessions = await Session.findAll({ where: { group: groupName }, attributes: ['sessionId'] });
    const sessionIds = sessions.map(s => s.sessionId);
    logger.db(`[deleteGroup: ${groupName}] Found ${sessionIds.length} sessions`);

    // 5. Get assignments and quizzes under those topics
    let assignIds = [];
    let quizIds = [];
    if (topicIds.length > 0) {
        const assignments = await Assignment.findAll({ where: { topicId: { [Op.in]: topicIds } }, attributes: ['assignId'] });
        assignIds = assignments.map(a => a.assignId);

        const quizzes = await Quiz.findAll({ where: { topicId: { [Op.in]: topicIds } }, attributes: ['quizId'] });
        quizIds = quizzes.map(q => q.quizId);
        logger.db(`[deleteGroup: ${groupName}] Found ${assignIds.length} assignments, ${quizIds.length} quizzes`);
    }

    // --- DELETE in correct order (children before parents) ---

    // Attendance (by sessionId OR studentId)
    if (sessionIds.length > 0 || studentIds.length > 0) {
        const attWhere = [];
        if (sessionIds.length > 0) attWhere.push({ sessionId: { [Op.in]: sessionIds } });
        if (studentIds.length > 0) attWhere.push({ studentId: { [Op.in]: studentIds } });
        await Attendance.destroy({ where: { [Op.or]: attWhere } });
        logger.db(`[deleteGroup: ${groupName}] Attendance deleted`);
    }

    // Submissions (by studentId, assId, or quizId)
    if (studentIds.length > 0 || assignIds.length > 0 || quizIds.length > 0) {
        const subWhere = [];
        if (studentIds.length > 0) subWhere.push({ studentId: { [Op.in]: studentIds } });
        if (assignIds.length > 0) subWhere.push({ assId: { [Op.in]: assignIds } });
        if (quizIds.length > 0) subWhere.push({ quizId: { [Op.in]: quizIds } });
        await Submission.destroy({ where: { [Op.or]: subWhere } });
        logger.db(`[deleteGroup: ${groupName}] Submissions deleted`);
    }

    // Rejection (by studentEmail)
    if (studentEmails.length > 0) {
        await Rejection.destroy({ where: { studentEmail: { [Op.in]: studentEmails } } });
        logger.db(`[deleteGroup: ${groupName}] Rejections deleted`);
    }

    // Registration (by group)
    await Registration.destroy({ where: { group: groupName } });
    logger.db(`[deleteGroup: ${groupName}] Registrations deleted`);

    // Material (by topicId)
    if (topicIds.length > 0) {
        await Material.destroy({ where: { topicId: { [Op.in]: topicIds } } });
        logger.db(`[deleteGroup: ${groupName}] Materials deleted`);
    }

    // Assignments (by topicId)
    if (assignIds.length > 0) {
        await Assignment.destroy({ where: { assignId: { [Op.in]: assignIds } } });
        logger.db(`[deleteGroup: ${groupName}] Assignments deleted`);
    }

    // Quizzes (by topicId)
    if (quizIds.length > 0) {
        await Quiz.destroy({ where: { quizId: { [Op.in]: quizIds } } });
        logger.db(`[deleteGroup: ${groupName}] Quizzes deleted`);
    }

    // Feed (by adminId)
    if (adminIds.length > 0) {
        await Feed.destroy({ where: { adminId: { [Op.in]: adminIds } } });
        logger.db(`[deleteGroup: ${groupName}] Feed deleted`);
    }

    // Sessions
    await Session.destroy({ where: { group: groupName } });
    logger.db(`[deleteGroup: ${groupName}] Sessions deleted`);

    // Topics
    await Topic.destroy({ where: { group: groupName } });
    logger.db(`[deleteGroup: ${groupName}] Topics deleted`);

    // Students
    await Student.destroy({ where: { group: groupName } });
    logger.db(`[deleteGroup: ${groupName}] Students deleted`);

    // Admins
    await Admin.destroy({ where: { group: groupName } });
    logger.db(`[deleteGroup: ${groupName}] Admins deleted`);

    // Group itself
    await Group.destroy({ where: { groupName } });
    logger.db(`[deleteGroup: ${groupName}] Group deleted`);
}



module.exports = {
    changeGroupName,
    deleteGroupName,
};
