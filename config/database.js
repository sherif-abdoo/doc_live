require('dotenv').config();
const { Sequelize } = require('sequelize');

const isProd = process.env.NODE_ENV === 'production';
const hasConnectionString = !!process.env.DATABASE_URL;

console.log("🔍 DB ENV CONFIG:", {
    mode: hasConnectionString ? 'DATABASE_URL' : 'separate fields',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    dialect: process.env.DB_DIALECT || 'postgres',
    node_env: process.env.NODE_ENV
});

let sequelize;

if (hasConnectionString) {
    // ✅ Render / production style: single connection string + SSL
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: isProd ? false : console.log
    });
} else {
    // ✅ Local dev: your original per-field setup (no SSL usually)
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USERNAME,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            dialect: process.env.DB_DIALECT || 'postgres',
            logging: console.log
        }
    );
}

module.exports = sequelize;
