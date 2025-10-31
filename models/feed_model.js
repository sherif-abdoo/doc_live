const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const Feed = sequelize.define('Feed', {
  feedId:{ type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true  },
  text: DataTypes.STRING,
  dateAndTime: {type : DataTypes.DATE, defaultValue: DataTypes.NOW },
  semester: DataTypes.STRING,
  adminId: DataTypes.INTEGER
}, { tableName: 'feed', timestamps: false });

module.exports = Feed;
