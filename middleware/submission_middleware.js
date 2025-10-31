const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const httpStatus = require('../utils/http.status');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper.js');
const admin = require('../data_link/admin_data_link.js');
const Submission = require('../models/submission_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const assignment = require('../data_link/assignment_data_link.js');
const { sanitizeInput } = require('../utils/sanitize.js');

const subExist = asyncWrapper(async (req,res ,next) => {
    sanitizeInput(req.params);
    const subId = req.params.id;
    const found = await admin.findSubmissionById(subId)
    if (!found) {
        return next(new AppError("Submission demanded is not found", httpStatus.NOT_FOUND));
    }
    console.log("Submission found : ",found);
    req.found=found;
    next();
})

const canSeeSubmission = asyncWrapper(async (req,res, next) => {
    const sub = req.found;
    const adminId = req.admin.id;
    if(!adminId){
        return next(new AppError("Admin not found", httpStatus.NOT_FOUND))
    }
    console.log("AdminId: ",adminId);
    if(sub.assistantId !== adminId &&  adminId !== 1){
        return next(new AppError("You are not allowed to view this submission", httpStatus.FORBIDDEN));
    }
    next();
})

const marked = asyncWrapper(async (req,res, next) => {
    const found = req.found;
    if(found.marked){
        return next(new AppError("Submission already marked", httpStatus.FORBIDDEN));
    }
    next();
})

const subMarked = asyncWrapper(async (req,res, next) => {
    const found = req.found;
    if(!found.marked){
        return next(new AppError("Submission not marked yet", httpStatus.BAD_REQUEST));
    }
    next();
})


const checkData = asyncWrapper(async (req,res, next) => {
    sanitizeInput(req.body);
    const {marked,score } = req.body
    const nscore = Number(score); // Convert score to a number
    if(!marked || !score){
        return next(new AppError("All fields are required", httpStatus.BAD_REQUEST));
    }
    const found = req.found;
    let total;
    if(found.type==="quiz"){
        const qfound = await quiz.getQuizById(found.quizId);
        total = qfound.mark
    }
    else{
        const afound = await assignment.getAssignmentById(found.assId);
        total = afound.mark
    }
    console.log("All fields checked");

    const pdfRegex = /^https?:\/\/.+\.pdf$/i;
    if (typeof marked !== 'string' || !pdfRegex.test(marked.trim())) {
        return next(new AppError("marked PDF must be a valid link ending with .pdf", httpStatus.BAD_REQUEST));
    }
    console.log("chack 2 done, pdf valid")

    if (typeof nscore !== 'number' || nscore <= 0 || nscore > total) {
        return next(new AppError("Score must be a positive number and less than the total score", httpStatus.BAD_REQUEST));
    }
    console.log("chack 3 done, duration valid")

    next();
})



module.exports ={
    subExist,
    canSeeSubmission,
    marked,
    checkData,
    subMarked
}