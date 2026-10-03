require("dotenv").config();

const mongoose = require("mongoose");

const {
  retrieveKnowledge,
  buildKnowledgeContext,
} = require("./services/ragService");

const connectDB = require("./config/db");

const test = async () => {
  try {
    await connectDB();

    console.log("\nTesting RAG retrieval...\n");

    const articles = await retrieveKnowledge({
      title: "Wi-Fi not working",
      description:
        "My laptop connects to office Wi-Fi but there is no internet.",
      category: "network",
      limit: 3,
    });

    console.log("Articles found:", articles.length);

    console.log("\nRetrieved Articles:");

    articles.forEach((article, index) => {
      console.log(
        `${index + 1}. ${article.title} (${article.category})`
      );
    });

    console.log("\nKnowledge Context:");

    console.log(buildKnowledgeContext(articles));

    await mongoose.connection.close();

    console.log("\nRAG test completed.");
  } catch (error) {
    console.error("RAG test failed:", error);

    await mongoose.connection.close();
    process.exit(1);
  }
};

test();