const sequelize = require('../config/database');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const Quiz = require('../models/quiz_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const assignment = require('../data_link/assignment_data_link.js');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const Topic = require('../models/topic_model.js');
const topic = require('../data_link/topic_data_link.js');
const { Op } = require("sequelize");
const material = require('../data_link/material_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');
const Session = require('../models/session_model.js');
const logger = require('../utils/logger')


const createTopic = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const { topicName, semester, subject } = req.body;
    const publisher = req.admin.id;
    const group = req.admin.group;
    logger.debug(`[admin : ${req.admin.email}] Creating topic - name: ${topicName}, subject: ${subject}, semester: ${semester}, group: ${group}`);
    const newTopic = await topic.createTopic(topicName, semester, publisher, subject, group);
    logger.info(`[admin : ${req.admin.email}] Topic created successfully, topicId: ${newTopic.topicId}`);
    return res.status(201).json({
        status: "success",
        message: "Topic created successfully",
        data: {
            id: newTopic.topicId,
            topicName: newTopic.topicName,
            subject: newTopic.subject,
            semester: newTopic.semester,
            group: group
        }
    });
});

const getTopicById = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { topicId } = req.params;
    const requester = req.user ? `[user : ${req.user.email}]` : req.admin ? `[admin : ${req.admin.email}]` : `[student : ${req.student.email}]`;
    logger.debug(`${requester} Fetching topic by id: ${topicId}`);
    const topicFound = await topic.getTopicById(topicId);
    const quizzes = (await quiz.getQuizzesByTopicId(topicId))
        .map(q => {
            const plain = q.get({ plain: true });
            return { ...plain, type: 'quiz' };
        });

    const assignments = (await assignment.getAssignmentsByTopicId(topicId))
        .map(a => {
            const plain = a.get({ plain: true });
            return { ...plain, type: 'pdf' };
        });

    const materials = (await material.getMaterialByTopicId(topicId))
        .map(a => {
            const plain = a.get({ plain: true });

            let type;
            const hasDocument = !!plain.document;
            const hasLink = !!plain.link;

            if (hasDocument && hasLink) type = 'both';
            else if (hasDocument) type = 'pdf';
            else if (hasLink) type = 'url';
            else type = 'unknown';

            return { ...plain, type };
        });

    logger.info(`${requester} Topic fetched: ${topicFound.topicName}, quizzes: ${quizzes.length}, assignments: ${assignments.length}, materials: ${materials.length}`);
    return res.status(200).json({
        status: "success",
        data: {
            id: topicId,
            topicName: topicFound.topicName,
            subject: topicFound.subject,
            semester: topicFound.semester,
            quizzes: quizzes,
            assignments: assignments,
            materials: materials
        }
    })
});

const getAllTopics = asyncWrapper(async (req, res, next) => {
    const group = req.user.group;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
    logger.debug(`${requester} Fetching all topics for group: ${group}`);
    let topics = (group === 'all') ?
        await topic.getAllTopics() :
        await topic.getAllTopicsByGroup(group);

    logger.info(`${requester} Retrieved ${topics.length} topics for group: ${group}`);
    return res.status(200).json({
        status: "success",
        message: `Retrieved ${topics.length} topics for group ${group}`,
        data: {
            topics: topics
        }
    })
});

const updateTopic = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const found = req.found;
    const { topicName, semester, subject } = req.body;
    logger.debug(`[admin : ${req.admin.email}] Updating topic: ${found.topicId}, new name: ${topicName}, semester: ${semester}, subject: ${subject}`);
    found.topicName = topicName || found.topicName;
    found.semester = semester || found.semester;
    found.subject = subject || found.subject;
    await found.save();
    logger.info(`[admin : ${req.admin.email}] Topic updated successfully, topicId: ${found.topicId}`);
    res.status(200).json({
        status: "success",
        message: `topic ${topicName} updated successfully `,
        data: {
            id: found.topicId,
            topicName: found.topicName,
            subject: found.subject,
            semester: found.semester,
            publisher: found.publisher,
            group: req.admin.group
        }
    });
});

const deleteTopic = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    logger.debug(`[admin : ${req.admin.email}] Deleting topic: ${found.topicId} - ${found.topicName}`);
    await Session.destroy({
        where: { topicId: found.topicId }
    });
    await found.destroy();
    logger.info(`[admin : ${req.admin.email}] Topic deleted successfully, topicId: ${found.topicId}`);
    res.status(200).json({
        status: "success",
        message: `topic with id: ${req.params.topicId} is deleted`
    });
});


module.exports = {
    createTopic,
    getTopicById,
    getAllTopics,
    updateTopic,
    deleteTopic
};