const sequelize = require('../config/database');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const Quiz = require('../models/quiz_model.js');
const quiz = require('../data_link/quiz_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const submission = require('../data_link/submission_data_link.js');
const Admin = require('../models/admin_model.js');
const Submission = require('../models/submission_model.js')
const Student = require('../models/student_model.js');
const sse = require('../utils/sseClients.js');
const { getCache } = require("../utils/cache");
const { setCache } = require("../utils/cache");
const { Op } = require("sequelize");
const {sanitizeInput} = require('../utils/sanitize.js');

const createQuiz = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const {mark,date,semester,durationInMin, topicId, title} = req.body;
    const publisher = req.admin.id; 
    const nmark = parseFloat(mark);
    const ndurationInMin = parseInt(durationInMin);
    console.log("publisher id:", publisher)
    console.log("Creating quiz with data:", {nmark,date,semester,ndurationInMin});
    const newQuiz = await quiz.createQuiz(nmark,publisher,date,semester,ndurationInMin, topicId, title);  
    return res.status(201).json({
        status: "success" ,
        data: { message: "Quiz created successfully", id: newQuiz.quizId }
    });
});


const getAllQuizzes = asyncWrapper(async (req, res) => {
    const group = req.user.group;
    console.log("Fetching quizzes for group:", group);

    // Get all quizzes based on group
    const quizzes = group === 'all' ? await quiz.getAllQuizzes() : await quiz.getAllQuizzesForGroup(group);
     const quizzesWithSubmission = [];
  if (req.user.type === "student") {
       
        
        for (const q of quizzes) {
            console.log(`Checking submission for student ${req.user.id} and quiz ${q.quizId}`);
            const submitted = await submission.getSubmissionForQuiz(req.user.id, q.quizId);
            
            // Convert to plain object and add submitted property
            quizzesWithSubmission.push({
                ...q.toJSON(), // or q.get({ plain: true }) or q.dataValues
                submitted: !!submitted
            });
        }
        
    }

    const data = req.user.type === "student" ? quizzesWithSubmission : quizzes;

    return res.status(200).json({
        status: "success",
        results: quizzes.length,
        data: { quizzes: data }
    })
});


const getQuizById = asyncWrapper(async (req, res, next) => {
    const quizData = req.quizData;
    const submitteed = await submission.getSubmissionForQuiz(req.user.id,quizData.quizId);
     const quizWithSubmission = {
        ...quizData.toJSON(), // or quizData.get({ plain: true }) or quizData.dataValues
        submitted: !!submitteed
    };
    return res.status(200).json({
        status: "success",
        data: { quizData: quizWithSubmission }
    });
});


const startQuiz = asyncWrapper(async (req, res) => {
    sanitizeInput(req.params);
    const { quizId } = req.params;
    const adminGroup = req.admin.group;

    // update quiz date to now
    await quiz.updateQuizDates(quizId, new Date());

    const quizData = await quiz.getQuizById(quizId);

    // cache key based on group
    const cacheKey = `activeQuiz:${adminGroup}`;

    // store quiz in cache
    setCache(cacheKey, quizData, (quizData.durationInMin * 60) + 600);

    sse.notifyStudents(adminGroup, {
        event: "quiz_start",
        message: `Quiz to group ${adminGroup} is gonna start now. Please check your dashboard.`,
        
      });

    return res.status(200).json({
        status: "success",
        data: { 
            message: `Quiz started for group ${adminGroup} and cached`, 
            quiz: quizData 
        }
    });
});



const getActiveQuiz = asyncWrapper(async (req, res, next) => {
    const activeQuiz = req.quizData;
    return res.status(200).json({
        status: "success",
        data: { activeQuiz }
    });
});


const submitActiveQuiz = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { answers } = req.body;
    const studentId = req.user.id;
    const found = await student.findStudentById(studentId);
    const activeQuiz = req.quizData;
    const newSub= await quiz.createSubmission(activeQuiz.quizId, studentId,found.assistantId ,answers, found.semester);

    return res.status(200).json({
        status: "success",
        data: { message: "Quiz submitted successfully" ,
        id: newSub.id  
        }
    });
});

const submitQuiz = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    sanitizeInput(req.body);
    const { answers } = req.body;
    const studentId = req.user.id;
    const found = await student.findStudentById(studentId);
    const {quizId} = req.params;
    const newSub= await quiz.createSubmission(quizId, studentId,found.assistantId ,answers, found.semester);

    return res.status(200).json({
        status: "success",
        data: { message: "Quiz submitted successfully" ,
        id: newSub.id  
        }
    });
});

const modifyQuiz = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { title, description } = req.body;
    const { quizId } = req.params;

    const quizData = await quiz.getQuizById(quizId);
    const modified = await Quiz.update({ title, description }, { where: { quizId } });
    if (!quizData) {
        return next(new AppError("Quiz not found", httpStatus.NOT_FOUND));
    }
    if (modified[0] === 0) {
        return next(new AppError("No changes made or quiz not found", httpStatus.NOT_FOUND));
    }
    return res.status(200).json({
        status: "success",
        data: { message: "Quiz modified successfully" }
    });
});

const deleteQuiz = asyncWrapper(async (req, res, next) => {
    const { quizId } = req.params;
    await quiz.findQuizAndDelete(quizId);
    return res.status(200).json({
        status: "success",
        data: { message: "Quiz deleted successfully" }
    });
});


module.exports = {
    createQuiz  ,
    getAllQuizzes,
    getQuizById, 
    startQuiz,
    getActiveQuiz,
    submitActiveQuiz,
    submitQuiz,
    modifyQuiz,
    deleteQuiz
};