const express = require("express");
const router = express.Router();
const { leaderBoard } = require("../controllers/leader_board");
const auth = require('../middleware/auth_middleware');

router.route("/")
    .get(auth.protect,leaderBoard);

module.exports = router;