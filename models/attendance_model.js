const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const Attendance = sequelize.define('Attendance', {
  attId: { type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true  },
  studentId: DataTypes.INTEGER,
  recordedAt: DataTypes.DATE,
  sessionId: DataTypes.INTEGER
}, { tableName: 'attendance', timestamps: false });

module.exports = Attendance;
