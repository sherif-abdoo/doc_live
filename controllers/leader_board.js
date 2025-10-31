const sequelize = require('../config/database');
const student = require('../data_link/student_data_link');
const asyncWrapper = require('../middleware/asyncwrapper');
const auth = require('../middleware/auth_middleware');

const leaderBoard = asyncWrapper(async (req, res, next) => {
    /* 
        http://DOK.com/leaderBoard/?page=1
        every page will render 20 students
    */

    const role = req.user.type;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit; 

    const result = await student.showLeaderBoard(limit,offset);

    const totalStudents = await student.getTotalNumberOfStudents();
    const totalPages = Math.ceil(totalStudents / limit);
    
    const id = req.user.id;

    if(role!=="admin"){
        const scoreObj = await student.getStudentScore(id);
        const score = scoreObj ? scoreObj.get("totalScore") : null;
        const rank = await student.getStudentRank(id);
        res.json({
        status: "success",
        data: {
            pagination: {
            currentPage: page,
            totalPages,
            totalStudents,
            },
            student: {
            score,
            rank,
            },
            leaderboard: result.rows,
        },
        });

    }
    else {
        res.json({
  status: "success",
    data: {
        pagination: {
        currentPage: page,
        totalPages,
        totalStudents,
        },
        leaderboard: result.rows,
    },
});

    }
  
});

module.exports = { leaderBoard };