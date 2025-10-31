const sequelize = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');

const Material = sequelize.define('Material', {
    materialId: { type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true },
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    document: DataTypes.STRING,
    uploadDate: DataTypes.DATE,
    topicId: DataTypes.INTEGER,
    publisher: DataTypes.INTEGER
    }, {
    tableName: 'material',
    timestamps: false
});
module.exports = Material;