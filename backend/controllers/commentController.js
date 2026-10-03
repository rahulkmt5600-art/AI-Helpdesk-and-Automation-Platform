const Ticket = require("../models/Ticket");
const Notification = require("../models/Notification");
const TicketComment = require("../models/TicketComment");
const { ApiError } = require("../middleware/errorHandler");
const asyncHandler = require("../middleware/asyncHandler");

/**
 * Check whether the logged-in user can access the ticket.
 */
const canAccessTicket = (ticket, user) => {
  // Admin can access every ticket
  if (user.role === "admin") {
    return true;
  }

  // Normal user can access only their own ticket
  if (user.role === "user") {
    return (
      ticket.createdBy &&
      ticket.createdBy.toString() === user._id.toString()
    );
  }

  // Agent and Team Lead can access tickets
  // assigned to their team
  if (user.role === "agent" || user.role === "teamLead") {
    return (
      ticket.assignedTeam &&
      user.team &&
      ticket.assignedTeam.toString() === user.team.toString()
    );
  }

  return false;
};

/**
 * GET /api/tickets/:id/comments
 *
 * Get all conversation messages for a ticket.
 */
const getComments = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (!canAccessTicket(ticket, req.user)) {
    throw new ApiError(
      403,
      "You do not have permission to view this ticket conversation"
    );
  }

  const comments = await TicketComment.find({
    ticket: ticket._id,
  })
    .populate("author", "name email role")
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    count: comments.length,
    comments,
  });
});

/**
 * POST /api/tickets/:id/comments
 *
 * Add a message/reply to a ticket.
 */
const addComment = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(400, "Comment message is required");
  }

  const ticket = await Ticket.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("assignedAgent", "name email")
    .populate("assignedTeam", "name");

  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  // Check access
  canAccessTicket(req.user, ticket);

  if (ticket.status === "closed") {
    throw new ApiError(
      400,
      "This ticket is closed and cannot receive new replies"
    );
  }

  const previousStatus = ticket.status;

  // Create comment
  const comment = await TicketComment.create({
    ticket: ticket._id,
    author: req.user._id,
    message: message.trim(),
  });

  /*
   * USER REPLIES
   *
   * If the requester replies after:
   * - waiting-for-user
   * - resolved
   *
   * move ticket back to in-progress.
   */
  if (req.user.role === "user") {
    if (
      ticket.status === "waiting-for-user" ||
      ticket.status === "resolved"
    ) {
      ticket.status = "in-progress";

      if (previousStatus === "resolved") {
        ticket.resolvedAt = null;
        ticket.resolvedBy = null;
      }
    }
  }

  /*
   * AGENT / TEAM LEAD REPLIES
   *
   * Their reply means the ticket is now waiting for
   * the requester.
   */
  if (req.user.role === "agent" || req.user.role === "teamLead") {
    if (
      ticket.status === "open" ||
      ticket.status === "in-progress" ||
      ticket.status === "waiting-for-user"
    ) {
      ticket.status = "waiting-for-user";
    }
  }

  await ticket.save();

  /*
   * ================================
   * CREATE NOTIFICATIONS
   * ================================
   */

  // USER replied → notify assigned agent/team lead
  if (req.user.role === "user") {
    const recipients = [];

    // Notify assigned agent
    if (
      ticket.assignedAgent &&
      ticket.assignedAgent._id.toString() !== req.user._id.toString()
    ) {
      recipients.push(ticket.assignedAgent._id);
    }

    // Find team leads for the assigned team
    if (ticket.assignedTeam) {
      const User = require("../models/User");

      const teamLeads = await User.find({
        role: "teamLead",
        team: ticket.assignedTeam._id,
      }).select("_id");

      for (const lead of teamLeads) {
        if (lead._id.toString() !== req.user._id.toString()) {
          recipients.push(lead._id);
        }
      }
    }

    // Remove duplicate recipients
    const uniqueRecipients = [
      ...new Set(recipients.map((id) => id.toString())),
    ];

    if (uniqueRecipients.length > 0) {
      await Notification.insertMany(
        uniqueRecipients.map((recipientId) => ({
          recipient: recipientId,
          type: "ticket_reply",
          title: "New Reply on Ticket",
          message: `${req.user.name || "The requester"} replied to "${ticket.title}"`,
          ticket: ticket._id,
          isRead: false,
        }))
      );
    }
  }

  // AGENT / TEAM LEAD replied → notify requester
  if (req.user.role === "agent" || req.user.role === "teamLead") {
    if (
      ticket.createdBy &&
      ticket.createdBy._id.toString() !== req.user._id.toString()
    ) {
      await Notification.create({
        recipient: ticket.createdBy._id,
        type: "ticket_reply",
        title: "New Reply on Your Ticket",
        message: `${req.user.name || "Support Team"} replied to "${ticket.title}"`,
        ticket: ticket._id,
        isRead: false,
      });
    }
  }

  // Return populated comment
  const populatedComment = await TicketComment.findById(comment._id)
    .populate("author", "name email role");

  res.status(201).json({
    success: true,
    message: "Reply added successfully",
    comment: populatedComment,
    ticketStatus: ticket.status,
  });
});

module.exports = {
  getComments,
  addComment,
};