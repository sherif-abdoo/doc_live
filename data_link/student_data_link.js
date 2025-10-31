const sequelize = require('../config/database');
const Student = require('../models/student_model');
const Admin = require('../models/admin_model');
const {where} = require("sequelize");
const Rejection = require('../models/rejection_model.js');
const Registration = require('../models/registration_model.js');
const Attendance = require('../models/attendance_model.js');
const Submission = require('../models/submission_model.js');
const {verify} = require("jsonwebtoken");

function findStudentByEmail(studentEmail){
    return Student.findOne({where : { studentEmail } })
}

function registerStudent(studentEmail, group, semester,phoneNumber){
    return Registration.create({
        studentEmail,
        group, semester, phoneNumber});
}

function createStudent(studentName,studentEmail,password,parentEmail,birthDate,
                       studentPhoneNumber,parentPhoneNumber,group,semester)
{
    return Student.create({
        studentName,
        studentEmail,
        password,
        parentEmail,
        birthDate,
        studentPhoneNumber,
        parentPhoneNumber,
        group,
        semester
    });
};

function findStudentById(studentId){
    return Student.findOne({where : { studentId } })
}

function findStudentByPhoneNumber(studentPhoneNumber){
    return Student.findOne({where : { studentPhoneNumber} })
}

function createAttendance(studentId, sessionId, semester) {
    return Attendance.create({
        studentId,
        recordedAt: new Date(),
        semester,
        sessionId
    });
}

function findAttendanceByStudentAndSession(studentId, sessionId) {
    return Attendance.findOne({ 
        where: { 
            studentId: studentId.toString(), 
            sessionId: sessionId.toString() 
        } 
    });
}

function getGroupById(studentId){
    return Student.findOne({where : { studentId } }).then(student=>{
        if(!student) return null;
        return student.group;
    })
}

function showSubmissions(studentId){
    return Submission.findAll({where:{studentId}, order: [['subId', 'DESC']]});
}

function getTotalNumberOfStudents(){
    return Student.count({where: { verified: true }});
}

function showLeaderBoard(limit,offset){
    return Student.findAndCountAll({
    attributes: ["studentName", "totalScore", "studentId"],
    where: { verified: true },
    order: [["totalScore", "DESC"]],
    limit,
    offset
    });
}

function getStudentScore(id){
    return Student.findOne({
        attributes: ["totalScore"],
        where: { studentId: id }   
    });
}


async function getStudentRank(id) {
  try {
    const [result] = await sequelize.query(
      `
      SELECT rank FROM (
        SELECT "studentId",
               RANK() OVER (ORDER BY "totalScore" DESC) AS rank
        FROM student
        WHERE verified = true
      ) ranked
      WHERE "studentId" = :id
      `,
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    return result ? result.rank : null;
  } catch (err) {
    console.error("Error in getStudentRank:", err.message);
    throw err;
  }
}

async function findAllStudentsForProfile(assistantId) {
  // Base conditions: verified and not banned
  const whereClause = {
    verified: true,
    ...(assistantId !== 1 && { assistantId: String(assistantId) }) // only filter by assistantId if not 1
  };

  return await Student.findAll({
    where: whereClause,
    attributes: ['studentId', 'studentName', 'totalScore', 'banned']
  });
}

async function getStudentsByAssistant(assistantId) {
  return await Student.findAll({
      where: { assistantId: String(assistantId) },
      attributes: ['studentId', 'studentName', 'totalScore']
    });
}

function deleteRegistrationBySemester(semester) {
    return Registration.destroy({ where: { semester } });
}

function deleteRejectionsBySemester(semester) {
    return Rejection.destroy({ where: { semester } });
}

function deleteStudentBySemester(semester) {
    return Student.destroy({ where: { semester } });
}


module.exports={
    findStudentByEmail,
    findAllStudentsForProfile,
    createStudent,
    registerStudent,
    findStudentById,
    createAttendance,
    findAttendanceByStudentAndSession,
    getGroupById,
    showSubmissions,
    getTotalNumberOfStudents,
    showLeaderBoard,
    getStudentScore,
    getStudentRank,
    getStudentsByAssistant,
    deleteRegistrationBySemester,
    deleteRejectionsBySemester,
    deleteStudentBySemester,
    findStudentByPhoneNumber
}