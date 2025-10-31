const sequelize = require('../config/database');
const Admin = require('../models/admin_model');
const Student = require('../models/student_model');
const asyncWrapper = require('../middleware/asyncwrapper');
const Rejection = require('../models/rejection_model');
const Registration = require('../models/registration_model');
const Session = require('../models/session_model');
const Feed = require('../models/feed_model');
const Submission = require('../models/submission_model');

function create(email,name,password,phoneNumber,group){
    return Admin.create({
        email,
        name,
        password,
        phoneNumber,
        group,
        role: "assistant",
        permission:"limited",
    });
}

function findAdminByEmail(email){
    return Admin.findOne({where : { email } })
}

function findByEmailAndId(studentEmail,id){
    return Rejection.findOne({where: { studentEmail, adminId: String(id) } })
}


function Destroy (email){
    return Rejection.destroy({
        where: { studentEmail: email   }
    })
}

function registrationDestroy (email){
    return Registration.destroy({
        where: { studentEmail: email   }
    })
}


function showPendingAdminRegistration(){
    return Admin.findAll({
        where: { verified : false }
    });
}

function createRejection(studentEmail,adminId,studentSemester){
    Rejection.create({
        studentEmail: studentEmail,
        adminId : adminId,
        semester: studentSemester,
        dateAndTime: new Date(),
    });
}


function findRegistration(studentEmail){
    return Registration.findOne({
        where: { studentEmail: studentEmail }
    });
}

function verifyAssistant(email){
    return Admin.update({ verified: true }, { where: { email } });
}

function removeAssistant(email){
    return Admin.destroy({
        where: {email}
    });
}

function getAdminById(adminId){
    return Admin.findOne({
        where: { adminId }
    });
}

function createSession(topicId, group, semester, dateAndTime, day) {
    return Session.create({
        topicId,
        semester,
        dateAndTime,
        group,
        day
    })};
    

function checkAssistantGroup(group){
    return Admin.findAll({
        where: { group, role: 'assistant' }
    });
}


function findNotVerifiedStudentsByTaGroup(TAGroup){
    return Student.findAll({
        where: {verified : false , group: TAGroup}});
}

function findVerifiedStudentsByTaGroup(TAGroup){
    return Student.findAll({
        where: {verified : true , group: TAGroup}});
}

function createPost(text,semester,adminId){
    return Feed.create({
        text,
        semester,
        adminId
    });
}


function Count(group){
    return Admin.count({
        where: { group: group }
    });
}

function findAdminById(adminID ){
    return Admin.findOne({
        where: { adminId: adminID }
    });
}

function findAdminByPhoneNumber(phoneNumber){
    return Admin.findOne({where : { phoneNumber } })
}

function getUnmarkedSubmissionsByAdminId(assistantId){
    console.log(assistantId);
    return Submission.findAll({where: { assistantId ,score : null}, order: [['subId', 'DESC']]});
}

function getAllUnmarkedSubmissions(){
    console.log("all sent")
    return Submission.findAll({where: { score : null}, order: [['subId', 'DESC']]});
}

function findSubmissionById(subId) {
    return Submission.findOne({
        where: { subId },
        attributes: {
            include: [
                ['subId', 'id'] // Rename subId → id
            ]
        }
    });
}
function getAllSubmissions(){
    console.log("getting all submissions")
    return Submission.findAll({order: [['subId', 'DESC']]});
}

function getAllSubmissionsById(assistantId){
    return Submission.findAll({where: { assistantId } , order: [['subId', 'DESC']]});
}

function getAdminNameById(adminId){
    return Admin.findOne({
        where: { adminId },
        attributes: ['name']
    });
}

module.exports={
    create,
    findNotVerifiedStudentsByTaGroup,
    Count,
    findAdminByEmail,
    findByEmailAndId,
    Destroy,
    registrationDestroy,
    createRejection,
    findRegistration,
    verifyAssistant,
    showPendingAdminRegistration,
    removeAssistant,
    checkAssistantGroup,
    findVerifiedStudentsByTaGroup,
    createSession,
    createPost,
    findAdminById,
    getUnmarkedSubmissionsByAdminId,
    getAllUnmarkedSubmissions,
    findSubmissionById,
    getAllSubmissions,
    getAllSubmissionsById,
    getAdminById,
    findAdminByPhoneNumber,
    getAdminNameById,
}