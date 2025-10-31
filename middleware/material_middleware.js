const sequelize = require('../config/database.js');
const AppError = require('../utils/app.error.js');
const httpStatus = require('../utils/http.status.js');
const asyncWrapper = require('./asyncwrapper.js');
const Quiz = require('../models/quiz_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const assignment = require('../data_link/assignment_data_link.js');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const Topic = require('../models/topic_model.js');
const material = require('../data_link/material_data_link.js');
const topic = require('../data_link/topic_data_link.js');
const { Op } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize.js');

const checkTopicExists = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { topicId } = req.body;
    const found = await topic.getTopicById(topicId);
    if (!found) {
        return next(new AppError(`Topic with id ${topicId} not found`, httpStatus.NOT_FOUND));
    }
    next();
});

const checkInputData = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { title, description, document, topicId } = req.body; 
    if (!title || !description || !document || !topicId) {
        return next(new AppError("Missing required fields: title, description, document, topicId", httpStatus.BAD_REQUEST));
    }
    next();
});

const findMaterialById = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { id } = req.params;
    const found = await material.getMaterialById(id);
    if (!found) {
        return next(new AppError(`Material with id ${id} not found`, httpStatus.NOT_FOUND));
    }
    req.found = found;
    console.log("Found material:", found);
    next();
}); 

const canSeeMaterial = asyncWrapper(async (req, res, next) => {
    const materialf = req.found;
    const userGroup = req.user.group;
    const publisher = await admin.getAdminById(materialf.publisher);
    if (publisher.group !== 'all' && publisher.group !== userGroup) {
        return next(new AppError("You do not have permission to view this material", httpStatus.FORBIDDEN));
    }
    console.log("User can see material");
    next();
});

const AdminViewMaterial = asyncWrapper(async (req, res, next) => {
    const materialf = req.found;
    const userGroup = req.admin.group;
    const publisher = await admin.getAdminById(materialf.publisher);
    if (publisher.group !== 'all' && publisher.group !== userGroup) {
        return next(new AppError("You do not have permission to view this material", httpStatus.FORBIDDEN));
    }
    console.log("User can see material");
    next();
});

module.exports = {
    checkTopicExists,
    checkInputData,
    findMaterialById,
    canSeeMaterial,
    AdminViewMaterial
};