const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const Registration = sequelize.define('Registrations', {
  studentEmail: { type: DataTypes.STRING, primaryKey: true },
  group: { type: DataTypes.STRING, allowNull: false },
  semester: DataTypes.STRING,
  dateAndTime: {type : DataTypes.DATE , defaultValue: DataTypes.NOW},
  rejectionCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'registration', timestamps: false });

module.exports = Registration;
