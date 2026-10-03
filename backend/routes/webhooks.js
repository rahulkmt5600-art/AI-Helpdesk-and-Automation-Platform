const express = require("express");
const router = express.Router();

const Ticket = require("../models/Ticket");
const Team = require("../models/Team");
const User = require("../models/User");

const { verifyApiKey } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { ApiError } = require("../middleware/errorHandler");

// POST /api/webhooks/n8n/assign-team
// Secure service-to-service endpoint called by n8n.
router.post(
  "/n8n/assign-team",
  verifyApiKey,
  asyncHandler(async (req, res) => {
    const { ticketId, teamName } = req.body;

    // ----------------------------------------------------------
    // Validate request
    // ----------------------------------------------------------

    if (!ticketId || !teamName) {
      throw new ApiError(400, "Please provide ticketId and teamName");
    }

    // ----------------------------------------------------------
    // Find ticket
    // ----------------------------------------------------------

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      throw new ApiError(
        404,
        `Ticket not found with ID: ${ticketId}`
      );
    }

    // ----------------------------------------------------------
    // Find team
    // ----------------------------------------------------------

    const team = await Team.findOne({ name: teamName });

    if (!team) {
      throw new ApiError(
        404,
        `Team not found with name: ${teamName}`
      );
    }

    // ----------------------------------------------------------
    // Assign team
    // ----------------------------------------------------------

    ticket.assignedTeam = team._id;

    // ----------------------------------------------------------
    // Find agents belonging to this team
    // ----------------------------------------------------------

    const agents = await User.find({
      role: "agent",
      team: team._id,
    }).select("_id name email");

    // ----------------------------------------------------------
    // Automatically assign least-loaded agent
    // ----------------------------------------------------------

    let assignedAgent = null;

    if (agents.length > 0) {
      let lowestLoad = Infinity;

      for (const agent of agents) {
        const currentLoad = await Ticket.countDocuments({
          assignedAgent: agent._id,
          status: {
            $in: [
              "open",
              "in-progress",
              "waiting-for-user",
            ],
          },
        });

        if (currentLoad < lowestLoad) {
          lowestLoad = currentLoad;
          assignedAgent = agent;
        }
      }

      if (assignedAgent) {
        ticket.assignedAgent = assignedAgent._id;
      }
    }

    // ----------------------------------------------------------
    // Save ticket
    // ----------------------------------------------------------

    await ticket.save();

    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------

    res.status(200).json({
      success: true,
      message: assignedAgent
        ? `Ticket assigned to ${assignedAgent.name} (${teamName})`
        : `Ticket assigned to ${teamName}, but no agent is available`,
      ticket,
      assignment: {
        team: teamName,
        agent: assignedAgent
          ? {
              id: assignedAgent._id,
              name: assignedAgent.name,
              email: assignedAgent.email,
            }
          : null,
      },
    });
  })
);

module.exports = router;