const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Topic = sequelize.define('Topic', {
  topicId: { type: DataTypes.INTEGER, 
    primaryKey: true,
    autoIncrement: true  },
  topicName: { type: DataTypes.STRING, allowNull: false },
  // topicStartDate: { type: DataTypes.DATE, allowNull: true},
  // topicEndDate: { type: DataTypes.DATE, allowNull: true },
  group: { type: DataTypes.STRING, allowNull: false },
  semester: { type: DataTypes.STRING, allowNull: false },
  publisher: { type: DataTypes.INTEGER, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'topic',
  timestamps: false
});
module.exports = Topic;
