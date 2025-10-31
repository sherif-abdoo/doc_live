// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { logIn , me , getAllGroups  } = require("../controllers/logIn");
const { forgetPassword } = require("../controllers/forget_password");
const { otpController,resetPassword } = require("../controllers/otp");
const auth = require("../middleware/auth_middleware");

router.post("/", logIn);

router.post("/forgetPassword",forgetPassword);

router.post('/otp',otpController);

router.post('/resetPassword/:email',resetPassword);

router.get('/me', auth.protect, me);

router.get('/getAllGroups',  getAllGroups);

module.exports = router;