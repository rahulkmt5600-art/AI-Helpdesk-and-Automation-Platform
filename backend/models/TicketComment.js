const mongoose = require("mongoose");

const ticketCommentSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: [true, "Comment message is required"],
      trim: true,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

ticketCommentSchema.index({
  ticket: 1,
  createdAt: 1,
});

module.exports = mongoose.model(
  "TicketComment",
  ticketCommentSchema
);