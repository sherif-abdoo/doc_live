// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/app.error"); // adjust path
const httpStatus = require("../utils/http.status"); // adjust path
const asyncWrapper = require("../middleware/asyncwrapper");
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const Group = require('../models/group_model.js');
const {sanitizeInput} = require('../utils/sanitize.js');
const logIn = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.body);
  const { email, password } = req.body;

  // ------------------- ADMIN LOGIN -------------------
  const adminUser = await admin.findAdminByEmail(email);
  if (adminUser) {
    const match = await bcrypt.compare(String(password), adminUser.password);
    if (!match) {
      return next(
        AppError.create("Invalid email or password", 400, httpStatus.Error)
      );
    }
    if (adminUser.verified === false) {
      return next(AppError.create("Email not verified", 403, httpStatus.Error));
    }

    const adminToken = jwt.sign(
      {
        id: adminUser.adminId,
        
        group: adminUser.group,
        type: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );
    console.log("Admin logged in:", adminUser.email);

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token: adminToken,
      data : { id: adminUser.adminId,
         email: adminUser.email,
          group: adminUser.group,
        name : adminUser.name,
      role : adminUser.role,
     }
    });
  }

  // ------------------- STUDENT LOGIN -------------------
  const studentUser = await student.findStudentByEmail(email);
  if (studentUser) {
    const valid = await bcrypt.compare(String(password), studentUser.password);
    if (!valid) {
      return next(AppError.create("Wrong password", 401, httpStatus.Error));
    }

    if (!studentUser.verified) {
      return next(AppError.create("Email not verified", 403, httpStatus.Error));
    }

    if (studentUser.banned) {
      return next(AppError.create("Your account is banned", 403, httpStatus.Error));
    }

    const studentToken = jwt.sign(
      {
        id: studentUser.studentId,
      
        group: studentUser.group,
        type: "student",
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    console.log("Student logged in:", studentUser.studentEmail);

    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token: studentToken,
      data : { id: studentUser.studentId, 
          email: studentUser.studentEmail,
          group: studentUser.group,
          name : studentUser.studentName,
          role : "student",
         }
    });
  }

  // ------------------- NOT FOUND -------------------
  return next(AppError.create("Email not found", 404, httpStatus.Error));
});

 
const me = asyncWrapper(async (req, res, next) => {
  const userId = req.user.id;
  // name id role group assid 
  const userType = req.user.type;
  
  if (userType === "admin") {
    const adminUser = await admin.findAdminById(userId);
    if (!adminUser) {
      return next(AppError.create("Admin not found", 404, httpStatus.Error));
    }
    return res.status(200).json({
      status: "success",
      data: { id: adminUser.adminId,
              group: adminUser.group,
              name : adminUser.name,
              role : adminUser.role,
           }
    });
  }
  else if (userType === "student") {
    const studentUser = await student.findStudentById(userId);
    if (!studentUser) {
      return next(AppError.create("Student not found", 404, httpStatus.Error));
    }
    return res.status(200).json({
      status: "success",
      data: { id: studentUser.studentId, 
          group: studentUser.group,
          name : studentUser.studentName,
          role : "student",
          assistantId : studentUser.assistantId
         }
    });
  }
});


const getAllGroups= asyncWrapper(async (req, res, next) => {
  const groups = await Group.findAll();
  return res.status(200).json({
    status: "success",
    data: {
      data: groups.map(group => ({
        groupId: group.groupId,
        groupName: group.groupName
      }))
    }
  });
});

module.exports = { logIn , me , getAllGroups };