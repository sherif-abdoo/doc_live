const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Student = sequelize.define('Student', {
  studentId: { type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true  },
  studentEmail:{ type:DataTypes.STRING , unique: true, allowNull: false, validate: { isEmail: true }},
  parentEmail: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true }},
  studentName: {type: DataTypes.STRING, allowNull: false},
  password: {type: DataTypes.STRING, allowNull: false},
  assistantId: {type: DataTypes.STRING},
  group: {type: DataTypes.STRING, allowNull: false},
  semester: {type: DataTypes.STRING, allowNull: false},
  parentPhoneNumber: {type: DataTypes.STRING, allowNull: false},
  studentPhoneNumber: {type: DataTypes.STRING, allowNull: false, unique: true},
  birthDate: {type: DataTypes.DATE, allowNull: false},
  totalScore: {type: DataTypes.FLOAT, defaultValue: 0},
  createdAt: {type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  verified: {type: DataTypes.BOOLEAN, defaultValue: false},
  banned: {type: DataTypes.BOOLEAN, defaultValue: false}
}, {
  tableName: 'student',
  timestamps: false
});

module.exports = Student;
