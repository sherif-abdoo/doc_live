const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const bcrypt = require('bcrypt');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper');
const admin = require('../data_link/admin_data_link');
const { sanitizeInput } = require('../utils/sanitize.js');


const findAdmin = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.params);
  const { email } = req.params;
  const assistant = await admin.findAdminByEmail(email);
  if (!assistant) {
    return next(new AppError('Admin not found', 404));
  }
  req.assistant = assistant;
  console.log("admin found") // attach found admin for later use
  next();
});



const checkRole = asyncWrapper(async (req, res, next) => {
  if (req.admin.id !== 1) {
    console.log(req.admin.id)
    return next(new AppError('You are not authorized to perform this action', 403));
  }
  console.log("checkRole passed");
  next();
});


module.exports = {
    findAdmin,
    checkRole
};