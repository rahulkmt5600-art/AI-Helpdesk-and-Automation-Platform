const KnowledgeBase = require("../models/KnowledgeBase");
const asyncHandler = require("../middleware/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");

// Get all active knowledge articles
const getKnowledgeArticles = asyncHandler(async (req, res) => {
  const articles = await KnowledgeBase.find({
    isActive: true,
  })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: articles.length,
    articles,
  });
});

// Search knowledge base
const searchKnowledgeBase = asyncHandler(async (req, res) => {
  const { q, category } = req.query;

  console.log("Knowledge search query:", q);
  console.log("Knowledge category:", category);

  if (!q && !category) {
    throw new ApiError(
      400,
      "Please provide a search query or category"
    );
  }

  const filter = {
    isActive: true,
  };

  if (category) {
    filter.category = category.toLowerCase();
  }

  let articles;
  if (q) {
    const searchText = q.trim();

    // Create variants so searches like "wifi" and "wi-fi"
    // can find the same knowledge article.
    const normalizedSearch = searchText
      .replace(/[-\s]+/g, "");

    const searchRegex = new RegExp(
      searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    const normalizedRegex = new RegExp(
      normalizedSearch.split("").join("[-\\s]*"),
      "i"
    );

    articles = await KnowledgeBase.find({
      ...filter,
      $or: [
        { title: searchRegex },
        { problem: searchRegex },
        { solution: searchRegex },
        { symptoms: searchRegex },
        { troubleshootingSteps: searchRegex },

        // Handles wifi → Wi-Fi
        { title: normalizedRegex },
        { problem: normalizedRegex },
        { solution: normalizedRegex },
        { symptoms: normalizedRegex },
        { troubleshootingSteps: normalizedRegex },
      ],
    })
      .select(
        "title category problem symptoms solution troubleshootingSteps"
      )
      .limit(5);
  }
  
   else {
    articles = await KnowledgeBase.find(filter)
      .select(
        "title category problem symptoms solution troubleshootingSteps"
      )
      .sort({ createdAt: -1 })
      .limit(10);
  }

  console.log(
    "Knowledge search results:",
    articles.length
  );

  res.status(200).json({
    success: true,
    count: articles.length,
    articles,
  });
});

module.exports = {
  getKnowledgeArticles,
  searchKnowledgeBase,
};