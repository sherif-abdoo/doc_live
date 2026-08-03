require("dotenv").config();
const sequelize = require('./config/database');
const express = require("express");
const httpStatusCode = require('./utils/http.status');
const cors = require('cors');
const logger = require('./utils/logger');

const app = express();

// -------------------- CORS --------------------
const STATIC_ALLOWED = new Set([
    'http://localhost:3000',
    'https://doc-frontend-live-772vbko5l-horizontal12.vercel.app',
    'https://doc-frontend-live-git-main-horizontal12.vercel.app',
    'https://dok-edu.com',
    'https://www.dok-edu.com',
]);

function isAllowedOrigin(origin) {
    if (!origin) return true;
    if (STATIC_ALLOWED.has(origin)) return true;
    try {
        const host = new URL(origin).hostname;
        if (host.endsWith('.vercel.app') && host.startsWith('doc-frontend-live-')) {
            return true;
        }
    } catch (_) { }
    return false;
}

const corsOrigin = (origin, cb) => cb(null, isAllowedOrigin(origin));

app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// -------------------- Routes --------------------
app.get('/health', (req, res) => res.status(200).send('OK'));

const adminRoutes = require('./routes/admin_routes');
const dokRoutes = require('./routes/dok_routes');
const studentRoutes = require('./routes/student_routes');
const logInRoute = require('./routes/logIn_route');
const feedRoute = require('./routes/feed_routes');
const quizRoutes = require('./routes/quiz_routes');
const assignmentRoutes = require('./routes/assignment_routes');
const sessionRoutes = require('./routes/session_routes');
const topicRoutes = require('./routes/topic_routes');
const leaderBoard = require('./routes/leader_board');
const materialRoutes = require('./routes/material_routes');

app.use('api/v2/admin', adminRoutes);
app.use('api/v2/dok', dokRoutes);
app.use('api/v2/student', studentRoutes);
app.use('api/v2/login', logInRoute);
app.use('api/v2/feed', feedRoute);
app.use('api/v2/quiz', quizRoutes);
app.use('api/v2/assignment', assignmentRoutes);
app.use('api/v2/material', materialRoutes);
app.use('api/v2/session', sessionRoutes);
app.use('api/v2/topic', topicRoutes);
app.use('api/v2/leaderBoard', leaderBoard);

// -------------------- Error handler (moved UP) --------------------
app.use((error, req, res, next) => {
    if (error.name === "ValidationError") {
        error.statusMessage = httpStatusCode.Error;
        error.statusCode = 400;
        error.message = "Invalid email format";
    }

    if (res.headersSent) {
        if (req.headers.accept === "text/event-stream") {
            res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
            return res.end();
        }
        return res.end();
    }

    res.status(error.statusCode || 400).json({
        status: error.statusMessage || httpStatusCode.Error,
        data: { message: error.message }
    });
});

// -------------------- DB + Start Server --------------------
(async () => {
    try {
        await sequelize.authenticate();
        logger.db('✅ Connection established.');

        await sequelize.sync({ alter: true });
        logger.db('✅ Database synced');

        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));
    } catch (error) {
        logger.error('❌ Database or server failed to start:', error);
    }
})();
