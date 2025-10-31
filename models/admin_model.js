const sequelize = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');
const Admin = sequelize.define('Admin', {
  adminId: { type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true  },
  email: {type:DataTypes.STRING , unique: true, allowNull: false, validate: { isEmail: true }},
  name: {type: DataTypes.STRING, allowNull: false},
  group: DataTypes.STRING,
  password: {type: DataTypes.STRING, allowNull: false},
  phoneNumber: {type: DataTypes.STRING, allowNull: false, unique: true},
  role: DataTypes.ENUM('assistant', 'teacher'),
  permission: DataTypes.ENUM('all', 'limited'),
    verified :{type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
}, {
  tableName: 'admin',
  timestamps: false
});

module.exports = Admin;

