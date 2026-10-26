const SSE = require('../utils/sseClients');
const asyncWrapper = require("../middleware/asyncwrapper");
const student = require('../data_link/student_data_link.js');
const admin = require('../data_link/admin_data_link.js');
const logger = require("../utils/logger");

const establishAdminConnection = async (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized: No admin found" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const adminFound = await admin.findAdminById(req.admin.id);

  res.write("event: connected\n");
  res.write(`data: ${JSON.stringify({
    message: "SSE connection established",
    admin: {
      id: req.admin.id,
      email: adminFound.email,
      name: adminFound.name,
      role: adminFound.role,
      group: req.admin.group,
    },
  })}\n\n`);

  SSE.addAdminClient(res, adminFound.email, adminFound.name, adminFound.role, req.admin.group);

  const hb = setInterval(() => {
    logger.debug("💓 Heartbeat sent to admin");
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(hb);
    SSE.removeClient(res);
  });
};

const establishStudentConnection = async (req, res) => {
  logger.debug("🔍 Incoming SSE request for student...");

  if (!req.student) {
    logger.debug("❌ No student attached to request");
    return res.status(401).json({ message: "Unauthorized: No student found" });
  }

  logger.debug("✅ Student object from req:", req.student);
  const found = await student.findStudentById(req.student.id);
  if (!found) {
    logger.debug("❌ Student not found in DB:", req.student.id);
    return res.status(404).json({ message: "Student not found in DB" });
  }

  logger.db(`[student : ${found.studentEmail} | ${found.studentName} | ${found.group}] ✅ Student found in DB`);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write("event: connected\n");
  res.write(`data: ${JSON.stringify({
    message: "SSE connection established",
    student: {
      id: found.studentId,
      email: found.studentEmail,
      name: found.studentName,
      group: found.group,
    },
  })}\n\n`);

  SSE.addStudentClient(res, found.studentEmail, found.studentName, found.group);
  logger.info(`[student : ${found.studentEmail} | ${found.studentName} | ${found.group}] 👨‍🎓 Added to SSE clients pool`);

  const hb = setInterval(() => {
    logger.debug("💓 Heartbeat sent to student");
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(hb);
    SSE.removeClient(res);
    logger.debug(`[student : ${found.studentEmail} | ${found.studentName} | ${found.group}] ❌ SSE connection closed`);
  });

  logger.info(`[student : ${found.studentEmail} | ${found.studentName} | ${found.group}] ✅ SSE established and waiting`);
};


module.exports = {
  establishAdminConnection,
  establishStudentConnection
};
