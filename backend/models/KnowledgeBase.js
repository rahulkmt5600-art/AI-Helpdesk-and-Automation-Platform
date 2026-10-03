const mongoose = require("mongoose");

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "hardware",
        "software",
        "network",
        "access",
        "billing",
        "other",
      ],
      required: true,
    },

    problem: {
      type: String,
      required: [true, "Problem description is required"],
      trim: true,
    },

    symptoms: {
      type: [String],
      default: [],
    },

    solution: {
      type: String,
      required: [true, "Solution is required"],
      trim: true,
    },

    troubleshootingSteps: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

knowledgeBaseSchema.index({
  title: "text",
  problem: "text",
  solution: "text",
});

knowledgeBaseSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model("KnowledgeBase", knowledgeBaseSchema);