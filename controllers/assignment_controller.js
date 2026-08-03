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
const { sanitizeInput } = require('../utils/sanitize.js');
const logger = require('../utils/logger');

const createAssignment = asyncWrapper(async (req, res) => {
  sanitizeInput(req.body);
  const { mark, document, endDate, semester, topicId, title, description } = req.body;
  const nmark = Number(mark);
  const startDate = new Date();
  const publisher = req.admin.id;
  logger.debug(`[admin : ${req.admin.email}] Creating assignment: ${title}, topicId: ${topicId}, mark: ${nmark}`);
  const createdAssignment = await assignment.createAssignment
    (nmark, document, startDate, endDate, semester, publisher, topicId, title, description)
  logger.info(`[admin : ${req.admin.email}] Assignment created successfully, id: ${createdAssignment.assignId}`);
  return res.status(201).json({
    status: "success",
    data: { message: "assignment created successfully", id: createdAssignment.assignId },
  });
});

const getAllAssignments = asyncWrapper(async (req, res) => {
  const group = req.user.group;
  const studentId = req.user.id;
  const requester = req.user.type === 'student' ? `[student : ${req.user.email}]` : `[user : ${req.user.email}]`;
  logger.debug(`${requester} Fetching all assignments for group: ${group}`);

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
  let submittedCount = 0;
  let submittedLateCount = 0;
  let missedCount = 0;
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
        let submittedLateCount = 0;

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

  logger.info(`${requester} Assignments fetched, count: ${assignments.length}, submitted: ${submittedCount}, missed: ${missedCount}`);
  return res.status(200).json({
    submitted: submittedCount,
    submittedLate: submittedLateCount,
    missed: missedCount,
    data: { assignments: Array.from(assignmentMap.values()) }
  });
});


const getAssignmentById = asyncWrapper(async (req, res) => {
  const assignData = req.assignData;
  const requester = req.user ? `[user : ${req.user.email}]` : req.admin ? `[admin : ${req.admin.email}]` : `[student : ${req.student.email}]`;
  logger.debug(`${requester} Fetching assignment by id: ${assignData.assignId}`);
  const topicf = await topic.getTopicById(assignData.topicId);
  const submitteed = await submission.getSubmissionForAssignment(req.user.id, assignData.assignId)
  const assignWithSubmission = {
    ...assignData.toJSON(),
    submitted: !!submitteed
  };
  logger.info(`${requester} Assignment fetched: ${assignData.assignId}`);
  return res.status(200).json({
    status: "success",
    data: {
      assignData: assignWithSubmission,
      subject: topicf.subject,
    }
  });
})

const submitAssignment = asyncWrapper(async (req, res) => {
  sanitizeInput(req.body);
  sanitizeInput(req.params);
  const { answers } = req.body;
  const studentId = req.student.id;
  const found = await student.findStudentById(studentId);
  const { assignId } = req.params;
  logger.debug(`[student : ${req.student.email}] Submitting assignment: ${assignId}`);
  if (req.submitted === "false") {
    logger.info(`[student : ${req.student.email}] Creating new submission for assignment: ${assignId}`);
    const newSub = await assignment.createSubmission(assignId, studentId, found.assistantId, answers, found.semester);
    return res.status(200).json({
      status: "success",
      data: { message: "Assignment submitted successfully", id: newSub.id }
    });
  } else {
    logger.info(`[student : ${req.student.email}] Resubmitting assignment: ${assignId}`);
    const studentSub = await student.findStudentById(req.student.id);
    const submission = await assignment.findSubmissionByAssignmentAndStudent(assignId, studentId);
    studentSub.totalScore -= submission.score;
    submission.score = null;
    submission.marked = null;
    studentSub.save();
    submission.answers = answers;
    submission.subDate = new Date();
    await submission.save();
    return res.status(200).json({
      status: "success",
      data: { message: "Assignment resubmitted successfully", id: submission.id }
    });
  }
})


const getUnsubmittedAssignments = asyncWrapper(async (req, res, next) => {
  const studentId = req.student.id;
  logger.debug(`[student : ${req.student.email}] Fetching unsubmitted assignments`);
  const studentProfile = await student.findStudentById(studentId);
  const group = studentProfile.group;

  // Fetch all assignments for this group
  const allAssignments = await assignment.getAllAssignmentsByGroup(group);

  // Fetch all submissions for this student
  const studentSubmissions = await submissions.getSubmissionsByStudentId(studentId);

  // Extract assignment IDs from submissions (use assId)
  const submittedAssignmentIds = studentSubmissions.map(s => Number(s.assId));

  // Keep only assignments the student has not submitted
  const assignments = allAssignments
    .map(a => (a.get ? a.get({ plain: true }) : a))
    .filter(assignmentPlain => !submittedAssignmentIds.includes(Number(assignmentPlain.assignId)))
    .map(assignmentPlain => ({
      assignId: assignmentPlain.assignId,
      title: assignmentPlain.title,
      subject: assignmentPlain.subject,
      topicId: assignmentPlain.topicId,
      endDate: assignmentPlain.endDate,
      submitted: 'false'
    }));
  logger.info(`[student : ${req.student.email}] Unsubmitted assignments fetched, count: ${assignments.length}`);
  return res.status(200).json({
    status: "success",
    data: { assignments },
  });
});


const deleteAllAssignmentSubmissionsFunc = asyncWrapper(async (req, res, next) => {
  logger.debug(`[admin : ${req.admin.email}] Deleting all assignment submissions`);
  await submissions.deleteAllAssignmentSubmissions();
  logger.info(`[admin : ${req.admin.email}] All assignment submissions deleted`);
  return res.status(200).json({
    status: "success",
    data: { message: "All submissions for the assignment deleted successfully" }
  });
});


const deleteAssignment = asyncWrapper(async (req, res, next) => {
  const { assignId } = req.params;
  logger.debug(`[admin : ${req.admin.email}] Deleting assignment: ${assignId}`);
  await assignment.findAssignmentAndDelete(assignId);
  logger.info(`[admin : ${req.admin.email}] Assignment deleted: ${assignId}`);
  return res.status(200).json({
    status: "success",
    data: { message: "Assignment deleted successfully" }
  });
});

const modifyAssignment = asyncWrapper(async (req, res, next) => {
  sanitizeInput(req.body);
  const { assignId } = req.params;
  const { title, description } = req.body;
  logger.debug(`[admin : ${req.admin.email}] Modifying assignment: ${assignId}, title: ${title}`);
  const modidfied = await Assignment.update(
    { title, description },
    { where: { assignId } }
  );
  if (modidfied[0] === 0) {
    logger.info(`[admin : ${req.admin.email}] No changes made for assignment: ${assignId}`);
    return next(new AppError("No changes made or assignment not found", httpStatus.NOT_FOUND));
  }
  logger.info(`[admin : ${req.admin.email}] Assignment modified successfully: ${assignId}`);
  return res.status(200).json({
    status: "success",
    data: { message: "Assignment modified successfully" }
  });
});


module.exports = {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  submitAssignment,
  getUnsubmittedAssignments,
  deleteAssignment,
  modifyAssignment,
  deleteAllAssignmentSubmissionsFunc
}
