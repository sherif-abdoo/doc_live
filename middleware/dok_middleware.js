const sequelize = require('../config/database');
const Admin = require('../models/admin_model.js');
const bcrypt = require('bcrypt');
const AppError = require('../utils/app.error');
const asyncWrapper = require('./asyncwrapper');
const admin = require('../data_link/admin_data_link');
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger');

const findAdmin = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.params);
  const { email } = req.params;
  logger.debug(`[system] Looking up assistant by email: ${email}`);
  const assistant = await admin.findAdminByEmail(email);
  if (!assistant) {
    logger.info(`[system] Assistant not found: ${email}`);
    return next(new AppError('Admin not found', 404));
  }
  req.assistant = assistant;
  logger.debug(`[system] Assistant found: ${email}, name: ${assistant.name}, group: ${assistant.group}`);
  next();
});

const checkRole = asyncWrapper(async (req, res, next) => {
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] Checking DOK role authorization, adminId: ${req.admin.id}`);
  if (req.admin.id !== 1) {
    logger.info(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] DOK authorization denied - not superadmin`);
    return next(new AppError('You are not authorized to perform this action', 403));
  }
  logger.debug(`[admin : ${req.admin.email} | ${req.admin.name} | ${req.admin.group}] DOK authorization granted`);
  next();
});


module.exports = {
  findAdmin,
  checkRole
};
