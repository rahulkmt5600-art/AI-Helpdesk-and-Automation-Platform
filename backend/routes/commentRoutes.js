const express = require("express");

const router = express.Router();

const {
  getComments,
  addComment,
} = require("../controllers/commentController");

const { protect } = require("../middleware/auth");

router.get(
  "/:id/comments",
  protect,
  getComments
);

router.post(
  "/:id/comments",
  protect,
  addComment
);

module.exports = router;