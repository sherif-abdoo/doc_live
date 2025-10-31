const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const Rejection = sequelize.define('Rejection', {
  studentEmail: { type: DataTypes.STRING },
  adminId: { type: DataTypes.STRING, allowNull: false },
  semester: DataTypes.STRING,
  dateAndTime: {type : DataTypes.DATE , defaultValue: DataTypes.NOW},
}, { tableName: 'rejection', timestamps: false });

module.exports = Rejection;