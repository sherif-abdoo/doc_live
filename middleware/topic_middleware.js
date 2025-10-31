const sequelize = require('../config/database');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const Quiz = require('../models/quiz_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const Topic = require('../models/topic_model.js');
const topic = require('../data_link/topic_data_link.js');
const { Op } = require("sequelize");
const { sanitizeInput } = require('../utils/sanitize.js');

const checkSemester = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { semester } = req.body;
    const toLow= semester.toLowerCase();
    if(toLow!== "june" && toLow !== "november"){
        return next(new AppError("Semester must be either 'June' or 'November'", httpStatus.BAD_REQUEST));
    }
    next();
});

const checkSubject = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { subject } = req.body;
    const toLow= subject.toLowerCase();
    if(toLow!== "biology" && toLow !== "physics" && toLow !== "chemistry"){
        return next(new AppError("Subject must be either 'Biology', 'Physics' or 'Chemistry'", httpStatus.BAD_REQUEST));
    }
    next();
});

const findTopicById = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { topicId } = req.params;
    const found = await topic.getTopicById(topicId );
    if (!found) {
        return next(new AppError("Topic not found", httpStatus.NOT_FOUND));
    }
    req.found = found;
    console.log("Topic found:", found);
    next();
})

const canSeeTopic= asyncWrapper(async (req, res, next) => {
    const found = req.found;
    const adminf = await admin.getAdminById(found.publisher);
    if(req.user.group !== adminf.group){
        return next(new AppError("You do not have permission to view this topic", httpStatus.FORBIDDEN));
    }
    console.log("User can see topic");
    next();
});

const canUpdateTopic = asyncWrapper(async (req, res, next) => {
    const group = req.admin.group;
    console.log("Admin group:", group);
    const found = req.found;
    const adminf = await admin.getAdminById(found.publisher);
    if(group !== adminf.group){
        return next(new AppError("You do not have permission to update this topic", httpStatus.FORBIDDEN));
    }
    next();
})

const checkData = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const {  semester, subject } = req.body;
    if(semester){ 
        const toLow= semester.toLowerCase();
    if(toLow!== "june" && toLow !== "november"){
        return next(new AppError("Semester must be either 'June' or 'November'", httpStatus.BAD_REQUEST));
    }}

    if(subject){
        const toLow= subject.toLowerCase();
    if(toLow!== "biology" && toLow !== "physics" && toLow !== "chemistry"){
        return next(new AppError("Subject must be either 'Biology', 'Physics' or 'Chemistry'", httpStatus.BAD_REQUEST));
    }}
    next();
});

module.exports = {
    checkSemester,
    checkSubject,
    findTopicById,
    canSeeTopic,
    canUpdateTopic,
    checkData
};