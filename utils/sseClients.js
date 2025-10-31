// utils/sseClients.js

// Store each client with metadata { res, role, group }
const sseClients = [];

/**
 * Add a new SSE client with role & group
 */
function addAdminClient(res,email, name, role, group) {
  const client = { res,email, name, role, group };
  sseClients.push(client);
  return client;
}

function addStudentClient(res,email, name,  group) {
  const client = { res,email, name, role: "student", group };
  sseClients.push(client);
  return client;
}

/**
 * Remove a client manually (used in req.on("close"))
 */
function removeClient(res) {
  const index = sseClients.findIndex((c) => c.res === res);
  if (index !== -1) {
    sseClients.splice(index, 1);
  }
}

/**
 * Send data only to assistants in the same group
 */
function notifyAssistants(group, payload) {
  const message =
    `event: ${payload.event || "message"}\n` +
    `data: ${JSON.stringify(payload)}\n\n`;

  sseClients.forEach((client) => {
    if (client.role === "assistant" && client.group === group) {
        try {
        client.res.write(message);
      } catch (err) {
        removeClient(client.res);
        client.res.end();
      }
    }
  });
}

function notifyStudents(group, payload) {
  const message =
    `event: ${payload.event || "message"}\n` +
    `data: ${JSON.stringify(payload)}\n\n`;

  sseClients.forEach((client) => {
    if (
      client.role === "student" &&
      (group === "all" || client.group === group)
    ) {
      try {
        client.res.write(message);
      } catch (err) {
        removeClient(client.res);
        client.res.end();
      }
    }
  });
}

module.exports = { addAdminClient, removeClient, notifyAssistants, addStudentClient, notifyStudents };
