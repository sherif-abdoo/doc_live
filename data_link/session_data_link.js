const sequelize = require('../config/database');
const Session = require('../models/session_model');
const {where} = require("sequelize");
const {verify} = require("jsonwebtoken");
const Admin = require('../models/admin_model');
const { Op, fn, col } = require("sequelize")
const Attendance = require('../models/attendance_model');
const Topic = require('../models/topic_model');
Session.belongsTo(Topic, { foreignKey: 'topicId' });
Session.hasMany(Attendance, { foreignKey: 'sessionId' });
Attendance.belongsTo(Session, { foreignKey: 'sessionId' });


function findSessionById(sessionId){
    return Session.findOne({where : { sessionId } });
}

function UpdateSession(sessionId, dateAndTime){
    return Session.update({dateAndTime},{where : { sessionId } })};

// async function findAllUpcomingSessionByGroup(group) {
//     return await Session.findAll({
//         include: [{
//             model: Admin,
//             where: { group },  // filter by admin's group
//             attributes: []     // don't return admin fields unless needed
//         }],
//         where: {
//             dateAndTime: {
//                 [Op.gt]: fn('NOW') // uses PostgreSQL current timestamp, avoids timezone mismatch
//             }
//         },
//         order: [['dateAndTime', 'ASC']]
//     });
// }

function getActiveSessionByGroup(group) {
    return Session.findOne({
        where: {
            group,
            finished: false
        },
        order: [['dateAndTime', 'DESC']]
    });
}

function hasAttendedSession(studentId, sessionId) {
    return Attendance.findOne({
        where: {
            studentId,
            sessionId
        }
    });
}

function recordAttendance(studentId, sessionId) {
    return Attendance.create({
        studentId,
        sessionId,
        recordedAt: new Date()
    });
}

async function getAllAttendanceForASession(sessionId){
    return await Attendance.findAll({
        where: { sessionId },
        attributes : {include : [['attId','id']]},
        order: [['recordedAt', 'ASC']]
    });
}

async function findAllSessionsByAdminGroup(group) {
  return await Session.findAll({
    where: { group },
    order: [['dateAndTime', 'DESC']],
    include: [
      {
        model: Topic,
        attributes: ['topicName', 'subject'], // only select what you need
        required: true // ensures only sessions with a valid topic are returned
      }
    ]
  });
}


async function findAllSessionsByStudentGroup(group, studentId) {
  return await Session.findAll({
    where: { group },
    order: [['dateAndTime', 'DESC']],
    include: [
      {
        model: Topic,
        attributes: ['topicName', 'subject'],
        required: true
      },
      {
        model: Attendance,
        attributes: [], 
        where: { studentId: studentId },
        required: false // LEFT JOIN
      }
    ],
    attributes: {
      include: [
        [
          sequelize.literal(`CASE WHEN "Attendances"."attId" IS NOT NULL THEN true ELSE false END`),
          'attended'
        ]
      ]
    }
  });
}


async function countAttendedSessionsByTopic(studentId, topicId) {
  const attendances = await Attendance.findAll({
    where: { studentId },
    include: [
      {
        model: Session,
        where: { topicId },
        attributes: [] // don't select session fields
      }
    ],
    attributes: ['attId'], // only select primary key (minimize data)
    raw: true // optional: faster, returns plain objects
  });
  return attendances.length;
}

async function countTotalSessionsByTopic(topicId) {
  const count = await Session.count({
    where: { topicId }
  });
  return count;
}

async function getSessionsByTopic(topicId, studentId) {
  const sessions = await Session.findAll({
    where: { topicId },
    order: [['dateAndTime', 'ASC']],
    include: [
      {
        model: Attendance,
        where: { studentId },
        required: false, // LEFT JOIN, so even missed sessions are included
        attributes: []
      }
    ],
    attributes: {
      include: [
        [
          sequelize.literal(`CASE WHEN "Attendances"."attId" IS NOT NULL THEN true ELSE false END`),
          'attended'
        ]
      ]
    }
  });

  return sessions.map(s => ({
    sessionId: s.sessionId,
    title: s.title,
    date: s.dateAndTime,
    status: s.getDataValue('attended') ? 'Attended' : 'Missed'
  }));
}

async function deleteAttendanceBySemester(semester) {
  return Attendance.destroy({
    where: {
      sessionId: {
        [Op.in]: sequelize.literal(`(
          SELECT "sessionId" FROM "session" WHERE semester = ${sequelize.escape(semester)}
        )`)
      }
    }
  });
}


function deleteSessionsBySemester(semester){
    return Session.destroy({ where: { semester } });
}

function getActiveSessionByAGroup(group) {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  return Session.findOne({
    where: {
      finished: false,
      group: group,
      dateAndTime: {
        [Op.between]: [twoHoursAgo, now],
      },
    },
    order: [['dateAndTime', 'DESC']],
  });
}

function getLastCreatedSessionByGroup(adminGroup){
    return Session.findOne({
        where: { group: adminGroup },
        order: [['dateAndTime', 'DESC']]
    });
}

async function existingSession(adminGroup){
  const now = new Date();
  const twoAndHalfHoursAgo = new Date(now.getTime() - 2.5 * 60 * 60 * 1000);
  return await Session.findOne({
    where: {
      finished: false,
      group: adminGroup,
      dateAndTime: {
        [Op.between]: [twoAndHalfHoursAgo, now],
      },
    },
  })};

module.exports={
    findSessionById,
    UpdateSession,
//    findAllUpcomingSessionByGroup,
    getActiveSessionByGroup,
    hasAttendedSession,
    recordAttendance,
    getAllAttendanceForASession,
    findAllSessionsByAdminGroup,
    findAllSessionsByStudentGroup,
    countAttendedSessionsByTopic,
    countTotalSessionsByTopic,
    getSessionsByTopic,
    deleteAttendanceBySemester,
    deleteSessionsBySemester,
    getActiveSessionByAGroup,
    getLastCreatedSessionByGroup,
    existingSession
}