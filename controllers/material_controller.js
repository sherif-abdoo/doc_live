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
const Material = require('../models/material_model');
const material = require('../data_link/material_data_link.js');
const { Op } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger');


const createMaterial = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { title, description, document, link, topicId } = req.body;
    const publisher = req.admin.id;
    const uploadDate = new Date();
    logger.debug(`[admin : ${req.admin.email}] Creating material: ${title}, topicId: ${topicId}`);
    const foundTopic = await topic.getTopicById(topicId);
    const newMaterial = await material.createMaterial(title, description, document, link, topicId, publisher, uploadDate);
    const materialWithSubject = {
        ...newMaterial.toJSON ? newMaterial.toJSON() : newMaterial,
        subject: foundTopic.subject
    };
    logger.info(`[admin : ${req.admin.email}] Material created successfully, id: ${newMaterial.materialId || newMaterial.id}`);
    return res.status(201).json({
        status: "success",
        message: "Material created successfully",
        data: { newMaterial: materialWithSubject }
    })
});

const getAllMaterials = asyncWrapper(async (req, res, next) => {
    const group = req.user.group;
    const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
    logger.debug(`${requester} Fetching all materials for group: ${group}`);
    const materials = (group === 'all'
        ? await material.getAllMaterialsAllGroups()
        : await material.getAllMaterialsByGroup(group));

    const materialsWithType = materials.map(mat => {
        const materialData = mat.toJSON ? mat.toJSON() : JSON.parse(JSON.stringify(mat));
        const documentUrl = materialData.document || '';
        const last4Chars = documentUrl.slice(-4).toLowerCase();
        const materialType = last4Chars === '.pdf' ? 'pdf' : 'url';
        materialData.type = materialType;
        return materialData;
    });

    logger.info(`${requester} Materials fetched, count: ${materialsWithType.length}`);
    return res.status(200).json({
        status: "success",
        results: materialsWithType.length,
        data: { materials: materialsWithType }
    });
});

const getMaterialById = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    const requester = req.user ? `[user : ${req.user.email}]` : req.admin ? `[admin : ${req.admin.email}]` : `[student : ${req.student.email}]`;
    logger.debug(`${requester} Fetching material by id: ${found.materialId || found.id}`);
    return res.status(200).json({
        status: "success",
        data: { found }
    });
});

const getMaterialByTopicId = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { topicId } = req.params;
    const requester = req.user ? `[user : ${req.user.email}]` : req.admin ? `[admin : ${req.admin.email}]` : `[student : ${req.student.email}]`;
    logger.debug(`${requester} Fetching materials for topicId: ${topicId}`);
    const materials = await material.getMaterialsByTopicId(topicId);
    if (materials.length === 0) {
        logger.info(`${requester} No materials found for topicId: ${topicId}`);
        return next(new AppError(`No materials found for topicId ${topicId}`, httpStatus.NOT_FOUND));
    }
    logger.info(`${requester} Materials fetched for topicId: ${topicId}, count: ${materials.length}`);
    return res.status(200).json({
        status: "success",
        results: materials.length,
        data: { materials }
    });
});

const updateMaterial = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    sanitizeInput(req.params);
    const materialId = req.params.id;
    const updateData = req.body;
    logger.debug(`[admin : ${req.admin.email}] Updating material: ${materialId}`);
    const updatedRows = await material.updateMaterial(materialId, updateData);
    if (updatedRows === 0) {
        logger.info(`[admin : ${req.admin.email}] No changes made for material: ${materialId}`);
        return next(new AppError(`Material with id ${materialId} not found or no changes made`, httpStatus.NOT_FOUND));
    }
    logger.info(`[admin : ${req.admin.email}] Material updated successfully: ${materialId}`);
    return res.status(200).json({
        status: "success",
        message: "Material updated successfully"
    });
});

const deleteMaterial = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const materialId = req.params.id;
    logger.debug(`[admin : ${req.admin.email}] Deleting material: ${materialId}`);
    const deletedRows = await material.deleteMaterial(materialId);
    if (deletedRows === 0) {
        logger.info(`[admin : ${req.admin.email}] Material not found: ${materialId}`);
        return next(new AppError(`Material with id ${materialId} not found`, httpStatus.NOT_FOUND));
    }
    logger.info(`[admin : ${req.admin.email}] Material deleted successfully: ${materialId}`);
    return res.status(200).json({
        status: "success",
        message: "Material deleted successfully"
    });
});

module.exports = {
    createMaterial,
    getAllMaterials,
    getMaterialById,
    getMaterialByTopicId,
    updateMaterial,
    deleteMaterial
};

