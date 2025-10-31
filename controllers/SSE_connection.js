const SSE = require('../utils/sseClients');
const asyncWrapper = require("../middleware/asyncwrapper");
const student = require('../data_link/student_data_link.js');
const admin = require('../data_link/admin_data_link.js');

const establishAdminConnection = async (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized: No admin found" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const adminFound  = await admin.findAdminById(req.admin.id);
  // Confirm connection event
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

  // Add admin to the SSE clients pool
  SSE.addAdminClient(res, adminFound.email, adminFound.name, adminFound.role, req.admin.group);

  // Heartbeat to keep connection alive
  const hb = setInterval(() => {
    console.log("💓 Heartbeat sent to admin");
    res.write(": ping\n\n");
  }, 25000);

  // Handle connection close
  req.on("close", () => {
    clearInterval(hb);
    SSE.removeClient(res); // 👈 you need this function in your pool manager
  });
};

const establishStudentConnection = async (req, res) => {
  console.log("🔍 Incoming SSE request for student...");

  if (!req.student) {
    console.log("❌ No student attached to request");
    return res.status(401).json({ message: "Unauthorized: No student found" });
  }

  console.log("✅ Student object from req:", req.student);
  const found = await student.findStudentById(req.student.id);
  if (!found) {
    console.log("❌ Student not found in DB:", req.student.id);
    return res.status(404).json({ message: "Student not found in DB" });
  }

  console.log("✅ Student found in DB:", found.studentEmail);

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  // Confirm connection event
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

  // Add student to the SSE clients pool
  SSE.addStudentClient(res, found.studentEmail, found.studentName, found.group);
  console.log(`👨‍🎓 Added ${found.studentEmail} to SSE clients pool`);

  // Heartbeat to keep connection alive
  const hb = setInterval(() => {
    console.log("💓 Heartbeat sent to student");
    res.write(": ping\n\n");
  }, 25000);

  // Handle connection close
  req.on("close", () => {
    clearInterval(hb);
    SSE.removeClient(res);
    console.log(`❌ SSE closed for student ${found.studentEmail}`);
  });

  console.log(`✅ SSE established and waiting for student ${found.studentEmail}`);
};


module.exports = {
  establishAdminConnection,
  establishStudentConnection
};