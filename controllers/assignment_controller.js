const sequelize = require('../config/database');
const AppError = require('../utils/app.error');
const httpStatus = require('../utils/http.status');
const asyncWrapper = require('../middleware/asyncwrapper');
const Assignment = require('../models/assignment_model.js');
const assignment = require('../data_link/assignment_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const student = require('../data_link/student_data_link.js');
const Admin = require('../models/admin_model.js');
const Student = require('../models/student_model.js');
const submission = require('../data_link/submission_data_link.js');
const Submission = require('../models/submission_model.js');
const submissions = require('../data_link/submission_data_link.js');  
const Topic = require('../models/topic_model.js');
const topic = require('../data_link/topic_data_link.js');
const {sanitizeInput}= require('../utils/sanitize.js');

const createAssignment = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    const {mark, document,  endDate, semester, topicId, title, description}= req.body;
    const startDate = new Date(); // current date
    const publisher = req.admin.id;
    const createdAssignment = await assignment.createAssignment
    (mark, document, startDate, endDate, semester, publisher,topicId, title, description) //7aga
    return res.status(201).json({
        status: "success" ,
        data: { message: "assignment created successfully", id: createdAssignment.assignId },
    });
});

const getAllAssignments = asyncWrapper(async (req, res) => {
  const group = req.user.group;
  const studentId = req.user.id; // adjust if different in your auth payload

  const assignments = (group === 'all'
    ? await assignment.getAllAssignments()
    : await assignment.getAllAssignmentsByGroup(group));

  const now = new Date();

  // Pull all submissions of this student (only assId column)
  const submissions = await Submission.findAll({
    where: { studentId },
    attributes: ['assId']
  });
  const submittedIds = new Set(submissions.map(s => s.assId));
  let submittedCount =0;
  let submittedLateCount =0;
  let missedCount =0;
  const assignmentMap = new Map(
    assignments.map(a => {
      const plain = a.get({ plain: true });

      let state;
      if (submittedIds.has(plain.assignId)) {
        // case 1: already submitted
        state = "submitted";
        submittedCount++;
      } else if (new Date(plain.endDate) < now) {
        // case 2: deadline passed, no submission
        state = "missing";
        missedCount++;
      } else {
        // case 3: not submitted yet, still open
        state = "unsubmitted";
        let submittedLateCount =0;

      }

      return [
        a.assignId,
        {
          ...plain,
          state
        }
      ];
    })
  );

  return res.status(200).json({
    status: "success",
    results: {count : assignments.length,
      submitted: submittedCount,
      submittedLate: submittedLateCount,
      missed: missedCount
    },
    data: { assignments: Array.from(assignmentMap.values()) }
  });
});


const getAssignmentById = asyncWrapper(async (req, res) => {
    const assignData = req.assignData;
    const topicf = await topic.getTopicById(assignData.topicId);
    const submitteed = await submission.getSubmissionForAssignment(req.user.id,assignData.assignId)
     const assignWithSubmission = {
        ...assignData.toJSON(), // or quizData.get({ plain: true }) or quizData.dataValues
        submitted: !!submitteed
    };
    return res.status(200).json({
        status: "success",
        data: { assignData:assignWithSubmission,
          subject: topicf.subject,
         }
    });
})

const submitAssignment = asyncWrapper(async (req, res) => {
    sanitizeInput(req.body);
    sanitizeInput(req.params);
    const { answers } = req.body;
    const studentId = req.user.id;
    const found = await student.findStudentById(studentId);
    const {assignId} = req.params;
    const newSub= await assignment.createSubmission(assignId, studentId,found.assistantId ,answers, found.semester);

    return res.status(200).json({
        status: "success",
        data: { message: "Assignment submitted successfully" ,
            id: newSub.id
        }
    });
})


const getUnsubmittedAssignments = asyncWrapper(async (req, res, next) => {
  const studentId = req.student.id;
  const studentProfile = await student.findStudentById(studentId);
  const group = studentProfile.group;

  // Fetch all assignments for this group
  const allAssignments = await assignment.getAllAssignmentsByGroup(group);

  // Fetch all submissions for this student
  const studentSubmissions = await submissions.getSubmissionsByStudentId(studentId);

  // Extract assignment IDs from submissions (use assId)
  const submittedAssignmentIds = studentSubmissions.map(s => Number(s.assId));

  // Map all assignments and mark submitted or not
  const assignments = allAssignments.map(a => {
    const assignmentPlain = a.get ? a.get({ plain: true }) : a;
    const isSubmitted = submittedAssignmentIds.includes(Number(assignmentPlain.assignId));

    // Remove the duplicate 'id' if it exists
    const { id, ...rest } = assignmentPlain;

    return {
      ...rest,
      submitted: isSubmitted ? 1 : 0
    };
  });

  return res.status(200).json({
    status: "success",
    data: { assignments },
  });
});





const deleteAssignment = asyncWrapper(async (req, res, next) => {
    const { assignId } = req.params;
    await assignment.findAssignmentAndDelete(assignId);
    return res.status(200).json({
        status: "success",
        data: { message: "Assignment deleted successfully" }
    });
});

const modifyAssignment = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.body);
  const { assignId } = req.params;
  const {title, description} = req.body;
  const modidfied = await Assignment.update(
    { title, description },
    { where: { assignId } }
  );
  if (modidfied[0] === 0) {
    return next(new AppError("No changes made or assignment not found", httpStatus.NOT_FOUND));
  }
  return res.status(200).json({
    status: "success",
    data: { message: "Assignment modified successfully" }
  });
});


module.exports={
    createAssignment,
    getAllAssignments,
    getAssignmentById,
    submitAssignment,
    getUnsubmittedAssignments,
    deleteAssignment,
    modifyAssignment
}
