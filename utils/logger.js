const winston = require('winston');
const { format, transports, createLogger } = winston;

// ✅ STEP 1: Define custom levels & colors
const customLevels = {
    levels: {
        error: 0,
        info: 1,
        db: 2,
        debug: 3
    },
    colors: {
        error: 'red',
        info: 'green',
        db: 'cyan',
        debug: 'yellow'
    }
};

// ✅ STEP 2: Register colors BEFORE creating logger
winston.addColors(customLevels.colors);

// ✅ STEP 3: CRITICAL FIX - Correct format order
const logger = createLogger({
    levels: customLevels.levels,
    level: 'debug',
    format: format.combine(
        // Order matters: timestamp → printf → colorize
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
            // Return CLEAN string WITHOUT color codes
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        }),
        format.colorize({ all: true }) // Apply colors LAST
    ),
    transports: [
        new transports.Console()
    ]
});

// Custom methods
logger.dbLog = (query, duration, params = {}) => {
    logger.log('db', 'Database Query', {
        query: query?.substring(0, 1000),
        duration: `${duration}ms`,
        params: params
    });
};

logger.httpLog = (method, url, statusCode, duration, ip = '') => {
    logger.info('HTTP Request', {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        ip
    });
};

module.exports = logger;
