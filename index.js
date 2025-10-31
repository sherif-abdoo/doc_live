require("dotenv").config();
const sequelize = require('./config/database');
const express = require("express");
const httpStatusCode = require('./utils/http.status');
const cors = require('cors');

const app = express();

/* -------------------- CORS (fixed) -------------------- */
// Allow prod domains + local dev + Vercel previews for this project
const STATIC_ALLOWED = new Set([
    'http://localhost:3000',
    'https://doc-frontend-live-772vbko5l-horizontal12.vercel.app',
    'https://doc-frontend-live-git-main-horizontal12.vercel.app',
    'https://dok-edu.com',
    'https://www.dok-edu.com',
]);

function isAllowedOrigin(origin) {
    if (!origin) return true; // server-to-server, curl, health checks
    if (STATIC_ALLOWED.has(origin)) return true;

    // allow your Vercel preview deploys for this project (adjust prefix if needed)
    try {
        const host = new URL(origin).hostname; // e.g. doc-frontend-live-xxxx-horizontal12.vercel.app
        if (host.endsWith('.vercel.app') && host.startsWith('doc-frontend-live-')) {
            return true;
        }
    } catch (_) {}

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

/* -------------------- Health -------------------- */
app.get('/health', (req, res) => res.status(200).send('OK'));

/* -------------------- DB connect log -------------------- */
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection established.');
    } catch (error) {
        console.error('❌ Unable to connect:', error);
    }
})();

const PORT = process.env.PORT || 3001;

/* -------------------- Start & routes -------------------- */
sequelize.sync({ alter: true }) // TODO: replace with migrations in prod
    .then(() => {
        console.log('✅ Database synced');

        // routes AFTER middleware
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

        app.use('/admin', adminRoutes);
        app.use('/dok', dokRoutes);
        app.use('/student', studentRoutes);
        app.use('/login', logInRoute);
        app.use('/feed', feedRoute);
        app.use('/quiz', quizRoutes);
        app.use('/assignment', assignmentRoutes);
        app.use('/material', materialRoutes);
        app.use('/session', sessionRoutes);
        app.use('/topic', topicRoutes);
        app.use('/leaderBoard', leaderBoard);

        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => console.error('❌ Failed to sync DB:', err));

/* -------------------- Error handler -------------------- */
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
