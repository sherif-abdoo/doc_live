const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const Session = sequelize.define('Session', {
  sessionId: { type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true  },
  topicId: DataTypes.INTEGER,
  group: DataTypes.STRING,
  semester: DataTypes.STRING,
  dateAndTime: DataTypes.DATE,
  finished: { type: DataTypes.BOOLEAN, defaultValue: false },
  day : DataTypes.STRING,
}, { tableName: 'session', timestamps: false });

module.exports = Session;
