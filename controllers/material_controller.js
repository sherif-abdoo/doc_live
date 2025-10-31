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
const material = require('../data_link/material_data_link');
const { Op } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize.js');

const createMaterial = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const {title, description, document, topicId} = req.body;
    const publisher = req.admin.id;
    const uploadDate = new Date();
    const foundTopic = await topic.getTopicById(topicId);
    console.log("Creating material with data:", { title, description, document, topicId, publisher, uploadDate });
    const newMaterial = await material.createMaterial(title, description, document, topicId, publisher, uploadDate);
    // ✅ Create a new response object that includes subject
    const materialWithSubject = {
        ...newMaterial.toJSON ? newMaterial.toJSON() : newMaterial, // Handle ORM instances
        subject: foundTopic.subject
    };
    return res.status(201).json({
        status: "success",
        message: "Material created successfully",
        data: { newMaterial: materialWithSubject }
    })
});

const getAllMaterials = asyncWrapper(async (req, res, next) => {
    const materials = await material.getAllMaterialsByGroup(req.user.group);
    return res.status(200).json({
        status: "success",
        results: materials.length,
        data: { materials }
    });

});

const getMaterialById = asyncWrapper(async (req, res, next) => {
    const found = req.found;
    return res.status(200).json({
        status: "success",
        data: { found }
    });
});

const getMaterialByTopicId = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { topicId } = req.params;
    const materials = await material.getMaterialsByTopicId(topicId);
    if (materials.length === 0) {
        return next(new AppError(`No materials found for topicId ${topicId}`, httpStatus.NOT_FOUND));
    }
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
    const updatedRows = await material.updateMaterial(materialId, updateData);
    if (updatedRows === 0) {
        return next(new AppError(`Material with id ${materialId} not found or no changes made`, httpStatus.NOT_FOUND));
    }
    return res.status(200).json({
        status: "success",
        message: "Material updated successfully"
    });
});

const deleteMaterial = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const materialId = req.params.id;
    const deletedRows = await material.deleteMaterial(materialId);
    if (deletedRows === 0) {
        return next(new AppError(`Material with id ${materialId} not found`, httpStatus.NOT_FOUND));
    }
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

