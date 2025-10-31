const sequelize = require('../config/database');
const { Sequelize, DataTypes } = require('sequelize');
const Group = sequelize.define('Group', {
  groupId: { type: DataTypes.INTEGER, 
    primaryKey: true,
    autoIncrement: true  },
    groupName: {type: DataTypes.STRING , unique: true, allowNull: false},
}, {
  tableName: 'groups',
  timestamps: false
});

module.exports = Group;