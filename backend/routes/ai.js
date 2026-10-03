const express = require("express");
const router = express.Router();
const { suggestReply } = require("../controllers/aiController");
const { protect, authorize } = require("../middleware/auth");

router.post(
  "/tickets/:id/suggest-reply",
  protect,
  authorize("agent", "teamLead", "admin"),
  suggestReply
);

module.exports = router;
