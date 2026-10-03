const express = require("express");

const {
  getKnowledgeArticles,
  searchKnowledgeBase,
} = require("../controllers/knowledgeController");

const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, getKnowledgeArticles);

router.get("/search", protect, searchKnowledgeBase);

module.exports = router;