const Ticket = require("../models/Ticket");
const { ApiError } = require("../middleware/errorHandler");
const asyncHandler = require("../middleware/asyncHandler");

const {
  generateSuggestedReply,
} = require("../services/groqService");

const {
  retrieveKnowledge,
  buildKnowledgeContext,
} = require("../services/ragService");

// POST /api/ai/tickets/:id/suggest-reply
// Agent/admin only.
const suggestReply = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate(
    "createdBy",
    "name"
  );

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  let draft;
  let articles = [];
  try {
    /*
     * Step 1:
     * Retrieve relevant Knowledge Base articles.
     */
    const articles = await retrieveKnowledge({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      limit: 3,
    });

    console.log(
      `RAG retrieved ${articles.length} knowledge article(s) for ticket ${ticket._id}`
    );

    /*
     * Step 2:
     * Convert the retrieved articles into LLM-readable context.
     */
    const knowledgeContext = buildKnowledgeContext(articles);

    /*
     * Step 3:
     * Send ticket + RAG context to Groq.
     */
    draft = await generateSuggestedReply(
      ticket,
      knowledgeContext
    );
  } catch (err) {
    console.error("AI reply generation failed:", err);

    throw new ApiError(
      502,
      "The AI reply suggestion is temporarily unavailable. Please try again shortly."
    );
  }

  /*
   * Always returned as a draft.
   * Nothing is automatically sent to the user.
   */
  res.status(200).json({
    success: true,
    draft,
    rag: {
      articleCount: articles.length,
      articles: articles.map((article) => ({
        id: article._id,
        title: article.title,
        category: article.category,
      })),
    },
  });
});

module.exports = {
  suggestReply,
};