const jwt = require('jsonwebtoken');
const Admin = require('../models/admin_model');
const Student = require('../models/student_model');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('./asyncwrapper');


const adminProtect = async (req, res, next) => {
  let token;

  // 1. Support for "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  else {
    console.log("No authorization header found");
    return next(new AppError('Not authorized, no token', 401));
  }

  // 2. Support for ?token=abc in query (for EventSource)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin') {
      return next(new AppError('Not authorized as admin', 401));
    }
    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      return next(new AppError('Admin not found', 401));
    }
    req.admin = decoded;
    console.log("admin protect finished") // attach payload
    next();
  } catch (error) {
    return next(new AppError('Not authorized, token failed', 401));
  }
};

const studentProtect = async (req, res, next) => {
  let token;

  // 1. Support for "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }else {
    console.log("No authorization header found");
    return next(new AppError('Not authorized, no token', 401));
  }

  // 2. Support for ?token=abc in query (for EventSource)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'student') {
      return next(new AppError('Not authorized as student', 401));
    }
    const student = await Student.findByPk(decoded.id);
    if (!student) {
      return next(new AppError('Student not found', 401));
    }
    if (student.banned) {
      return next(new AppError('Your account has been banned. ', 401));
    }
    req.student = decoded; // attach payload
    console.log("student protect finished") 
    next();
  } catch (error) {
    return next(new AppError('Not authorized, token failed', 401));
  }
};



const protect = asyncWrapper(async (req, res, next) => {
   let token;

  // 1. Support for "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }else {
    console.log("No authorization header found");
    return next(new AppError('Not authorized, no token', 401));
  }

  // 2. Support for ?token=abc in query (for EventSource)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('Not authorized, no token', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userType = decoded.type;
    
    let user;
    if (userType === 'admin') {
      user = await Admin.findByPk(decoded.id);
      if (!user) {
        return next(new AppError('Admin not found', 401));
      }
    } else if (userType === 'student') {
      user = await Student.findByPk(decoded.id);
      if (!user) {
        return next(new AppError('Student not found', 401));
      }
      if (user.banned) {
        return next(new AppError('Your account has been banned. ', 401));
      } 
    }
    req.user = decoded; // attach payload
    console.log("protect finished")
    next();
  } catch (error) {
    return next(new AppError('Not authorized, token failed', 401));
  }

});



module.exports = { 
  adminProtect,
  studentProtect,
  protect
 };

