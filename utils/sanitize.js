const { JSDOM } = require("jsdom");
const createDOMPurify = require("dompurify");

// Create a fake DOM for DOMPurify to work with
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

function sanitizeInput(input) {
  const sanitized = {};

  for (const [key, value] of Object.entries(input)) {
    sanitized[key] = DOMPurify.sanitize(value);
  }

  Object.assign(input, sanitized);

  return input; // return clean object
}

module.exports = { sanitizeInput };
