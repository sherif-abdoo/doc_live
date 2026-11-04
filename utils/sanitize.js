const { JSDOM } = require("jsdom");
const createDOMPurify = require("dompurify");

// Create a fake DOM for DOMPurify to work with
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

function sanitizeInput(input) {
  const sanitized = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      sanitized[key] = DOMPurify.sanitize(value);
    } else {
      sanitized[key] = value; // leave arrays, numbers, booleans, objects untouched
    }
  }

  Object.assign(input, sanitized);

  return input;
}

module.exports = { sanitizeInput };
