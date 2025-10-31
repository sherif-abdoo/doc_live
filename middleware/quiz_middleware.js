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
const { getCache } = require("../utils/cache");
const { sanitizeInput } = require('../utils/sanitize.js');

const checkFields = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const {mark,date,semester,durationInMin,} = req.body;
    const nmark = parseFloat(mark);
    const ndurationInMin = parseInt(durationInMin);
    if (nmark == null  || date == null || semester == null || ndurationInMin == null) {
        return next(new AppError("All fields are required", httpStatus.BAD_REQUEST));
    }
    console.log("chack 1 done, all fields present")
    if (typeof nmark !== 'number' || nmark < 0) {
        return next(new AppError("Mark must be a non-negative number", httpStatus.BAD_REQUEST));
    }
    console.log("chack 2 done, mark valid")
     // quizPdf must be a valid URL ending with .pdf
    // const pdfRegex = /^https?:\/\/.+\.pdf$/i;
    // if (typeof quizPdf !== 'string' || !pdfRegex.test(quizPdf.trim())) {
    //     return next(new AppError("Quiz PDF must be a valid link ending with .pdf", httpStatus.BAD_REQUEST));
    // }
    // console.log("chack 3 done, pdf valid")

    // allow any date format that JS Date can parse
    const parsedDate = new Date(date);
    if (parsedDate.toString() === "Invalid Date") {
        return next(new AppError("Invalid date format", httpStatus.BAD_REQUEST));
    }
    console.log("chack 4 done, date valid")

    if (typeof semester !== 'string' || semester.trim() === '') {
        return next(new AppError("Semester must be a non-empty string", httpStatus.BAD_REQUEST));
    }
    console.log("chack 5 done, semester valid")

    if (typeof ndurationInMin !== 'number' || ndurationInMin <= 0) {
        return next(new AppError("Duration must be a positive number", httpStatus.BAD_REQUEST));
    }
    console.log("chack 6 done, duration valid")
    next();
});

const getGroup = asyncWrapper(async (req, res, next) => {
    const group = req.user.group
    if (!group) {
        return next(new AppError("Group not found", httpStatus.NOT_FOUND));
    }
    req.group = group;
    console.log("group sent :", group)
    next();
});

// check topic exist

const quizExists = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.params);
    const { quizId } = req.params;
    const quizData = await quiz.getQuizById(quizId);
    if (!quizData) {
        return next(new AppError("Quiz not found", httpStatus.NOT_FOUND));
    }
    console.log("Quiz found:", quizData);
    req.quizData = quizData;
    next();
});

const canAccessQuiz = asyncWrapper(async (req, res, next) => {
    const userGroup = req.admin.group ;
    const quizData = req.quizData;
    const publisher = await admin.findAdminById(quizData.publisher);
    if (!publisher) {
        return next(new AppError("Publisher not found", httpStatus.NOT_FOUND));
    }

    if (publisher.group !== 'all' && publisher.group !== userGroup&& userGroup !== 'all') {
        return next(new AppError("You do not have permission to access this quiz", httpStatus.FORBIDDEN));
    }
    console.log("User has permission to access the quiz");
    next();
});



const canSeeQuiz = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group ;
    const quizData = req.quizData;
    const publisher = await admin.findAdminById(quizData.publisher);
    if (!publisher) {
        return next(new AppError("Publisher not found", httpStatus.NOT_FOUND));
    }

    if (publisher.group !== 'all' && publisher.group !== userGroup&& userGroup !== 'all') {
        return next(new AppError("You do not have permission to view this quiz", httpStatus.FORBIDDEN));
    }
    console.log("User has permission to view the quiz");
    next();
});

const activeQuizExists = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;

    // Try to fetch quiz for user's group
    let activeQuiz = await getCache(`activeQuiz:${userGroup}`);

    // If not found, try the "all" group quiz
    if (!activeQuiz) {
        activeQuiz = await getCache("activeQuiz:all");
    }

    if (!activeQuiz) {
        return next(new AppError("No active quiz found", httpStatus.NOT_FOUND));
    }
    console.log("active quiz exists")
    req.quizData = activeQuiz;
    next();
});

const submittedBefore = asyncWrapper(async (req, res, next) => {
    const subQuiz = req.quizData;
    const studentId= req.user.id;
    const submission = await quiz.findSubmissionByQuizAndStudent(subQuiz.quizId,studentId);
    if(submission){
        return next(new AppError("You cannot submit same quiz twice", httpStatus.FORBIDDEN));
    }
    next();
});

const canAccessActiveQuiz = asyncWrapper(async (req, res, next) => {
    const userGroup = req.user.group;
    const activeQuiz = req.quizData;
    const publisher = await admin.findAdminById(activeQuiz.publisher);

    // publisher group is already baked into how the quiz was cached
    // so here you just check group compatibility
    if (userGroup !== 'all' && publisher.group !== userGroup && publisher.group !== 'all') {
        return next(new AppError("You do not have permission to access this active quiz", httpStatus.FORBIDDEN));
    }

    console.log(`✅ User from group ${userGroup} can access quiz for group ${publisher.group}`);
    next();
});

const verifySubmissionPDF = asyncWrapper(async (req, res, next) => {
    sanitizeInput(req.body);
    const { answers } = req.body;

    // allow query params after .pdf
    const pdfRegex = /^https?:\/\/.+\.pdf(\?.*)?$/i;

    if (typeof answers !== 'string' || !pdfRegex.test(answers.trim())) {
        return next(new AppError("answers PDF must be a valid link ending with .pdf", httpStatus.BAD_REQUEST));
    }

    console.log("valid Pdf");
    next();
});


const verifySubmissionTiming = asyncWrapper(async (req, res, next) => {
    const activeQuiz = req.quizData;

    let deadline = new Date(activeQuiz.date);
    deadline += activeQuiz.durationInMin * 60000
    console.log (deadline)
    if (new Date() > deadline) {
        return next(new AppError("Quiz submission time has expired", httpStatus.BAD_REQUEST));
    }
    console.log("Quiz submission is within the allowed time frame");
    next();
});



module.exports = {
    checkFields,
    getGroup,
    quizExists ,
    canSeeQuiz ,
    canAccessQuiz ,
    activeQuizExists ,
    canAccessActiveQuiz ,
    verifySubmissionPDF,
    verifySubmissionTiming,
    submittedBefore
};