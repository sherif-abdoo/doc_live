const sequelize = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');
const Assignment = sequelize.define('Assignment', {
  assignId: { type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true  },
  publisher: DataTypes.INTEGER,
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  mark: DataTypes.INTEGER,
  document: DataTypes.STRING,
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
  semester: DataTypes.STRING,
  topicId: DataTypes.INTEGER
}, { tableName: 'assignment', timestamps: false });

module.exports = Assignment;
