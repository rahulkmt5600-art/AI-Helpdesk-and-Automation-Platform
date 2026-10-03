const KnowledgeBase = require("../models/KnowledgeBase");

/**
 * Search the Knowledge Base for articles relevant to a ticket.
 *
 * @param {Object} params
 * @param {String} params.title
 * @param {String} params.description
 * @param {String} params.category
 * @param {Number} params.limit
 */
const retrieveKnowledge = async ({
  title = "",
  description = "",
  category = "",
  limit = 3,
}) => {
  const searchText = `${title} ${description}`.trim();

  if (!searchText && !category) {
    return [];
  }

  const filter = {
    isActive: true,
  };

  if (category) {
    filter.category = category.toLowerCase();
  }

  let articles = [];

  /*
   * First try category + text matching.
   */
  if (searchText) {
    const words = searchText
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3);

    const uniqueWords = [...new Set(words)];

    if (uniqueWords.length > 0) {
      const regexPatterns = uniqueWords.map(
        (word) =>
          new RegExp(
            word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"),
            "i"
          )
      );

      articles = await KnowledgeBase.find({
        ...filter,
        $or: regexPatterns.flatMap((regex) => [
          { title: regex },
          { problem: regex },
          { solution: regex },
          { symptoms: regex },
          { troubleshootingSteps: regex },
        ]),
      })
        .select(
          "title category problem symptoms solution troubleshootingSteps"
        )
        .limit(limit);
    }
  }

  /*
   * If nothing matched, fall back to category articles.
   */
  if (articles.length === 0 && category) {
    articles = await KnowledgeBase.find({
      isActive: true,
      category: category.toLowerCase(),
    })
      .select(
        "title category problem symptoms solution troubleshootingSteps"
      )
      .limit(limit);
  }

  return articles;
};

/**
 * Convert retrieved articles into a clean text context
 * that can later be sent to the LLM.
 */
const buildKnowledgeContext = (articles) => {
  if (!articles || articles.length === 0) {
    return "No relevant knowledge base articles were found.";
  }

  return articles
    .map((article, index) => {
      return `
Knowledge Article ${index + 1}

Title:
${article.title}

Category:
${article.category}

Problem:
${article.problem}

Symptoms:
${article.symptoms?.join(", ") || "Not specified"}

Solution:
${article.solution}

Troubleshooting Steps:
${
  article.troubleshootingSteps?.length
    ? article.troubleshootingSteps
        .map((step, i) => `${i + 1}. ${step}`)
        .join("\n")
    : "Not specified"
}
`;
    })
    .join("\n-------------------------\n");
};

module.exports = {
  retrieveKnowledge,
  buildKnowledgeContext,
};