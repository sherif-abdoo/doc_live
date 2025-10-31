const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId }, 
    process.env.ACCESS_SECRET,   // 👈 must match protect middleware
    { expiresIn: '30d' }         // token valid for 30 days
  );
};

module.exports = generateToken;
