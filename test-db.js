require('dotenv').config();
const { sequelize } = require('./models');
const logger = require('../utils/logger')


    (async () => {
        try {
            await sequelize.authenticate();
            logger, db('✅ Connection has been established successfully.');
        } catch (error) {
            logger.error('❌ Unable to connect to the database:', error);
        } finally {
            await sequelize.close();
        }
    })();
