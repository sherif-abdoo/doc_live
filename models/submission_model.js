const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const Submission = sequelize.define('Submission', {
  subId: {  type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true },
  score: DataTypes.FLOAT,
  answers: DataTypes.STRING,
  marked:  DataTypes.STRING,
  subDate: {type: DataTypes.DATE , defaultValue: DataTypes.NOW},
  studentId: DataTypes.INTEGER,
  assistantId: DataTypes.INTEGER,
  type: DataTypes.ENUM('quiz','assignment'),
  semester: DataTypes.STRING,
  quizId: DataTypes.INTEGER,
  assId: DataTypes.INTEGER,
  markedAt: {type: DataTypes.DATE , defaultValue: DataTypes.NOW}, 
  feedback: DataTypes.STRING,
}, { tableName: 'submission', timestamps: false });

module.exports = Submission;
