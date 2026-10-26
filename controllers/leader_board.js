const sequelize = require('../config/database');
const student = require('../data_link/student_data_link');
const asyncWrapper = require('../middleware/asyncwrapper');
const auth = require('../middleware/auth_middleware');
const logger = require('../utils/logger');

const leaderBoard = asyncWrapper(async (req, res, next) => {
    const role = req.user.type;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const id = req.user.id;

    const requester = role === 'student'
        ? `[student : ${req.user.email} | ${req.user.name} | ${req.user.group}]`
        : `[admin : ${req.user.email} | ${req.user.name} | ${req.user.group}]`;

    logger.debug(`${requester} Fetching leaderboard, page: ${page}, limit: ${limit}, offset: ${offset}`);

    const result = await student.showLeaderBoard(limit, offset);
    const totalStudents = await student.getTotalNumberOfStudents();
    const totalPages = Math.ceil(totalStudents / limit);

    logger.debug(`${requester} Leaderboard data loaded, totalStudents: ${totalStudents}, totalPages: ${totalPages}`);

    if (role !== "admin") {
        logger.debug(`${requester} Fetching personal score and rank`);
        const scoreObj = await student.getStudentScore(id);
        const score = scoreObj ? scoreObj.get("totalScore") : null;
        const rank = await student.getStudentRank(id);
        logger.info(`${requester} Leaderboard fetched, score: ${score}, rank: ${rank}`);
        return res.json({
            status: "success",
            data: {
                pagination: { currentPage: page, totalPages, totalStudents },
                student: { score, rank },
                leaderboard: result.rows,
            },
        });
    }

    logger.info(`${requester} Leaderboard fetched for admin view, totalStudents: ${totalStudents}`);
    return res.json({
        status: "success",
        data: {
            pagination: { currentPage: page, totalPages, totalStudents },
            leaderboard: result.rows,
        },
    });
});

module.exports = { leaderBoard };
