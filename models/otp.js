const sequelize = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');

const OTP = sequelize.define("OTP", {
  email: { type: DataTypes.STRING, allowNull: false },
  otp: { type: DataTypes.STRING, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: "otp",
  timestamps: true
});

module.exports = OTP;