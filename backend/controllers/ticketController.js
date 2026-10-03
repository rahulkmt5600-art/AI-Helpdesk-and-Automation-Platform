const Ticket = require("../models/Ticket");
const { ApiError } = require("../middleware/errorHandler");
const asyncHandler = require("../middleware/asyncHandler");
const { classifyTicket } = require("../services/groqService");

// ============================================================
// SLA HELPER
// ============================================================

const isTicketSlaBreached = (ticket) => {
  // Resolved/closed tickets are no longer considered breached
  if (
    ticket.status === "resolved" ||
    ticket.status === "closed"
  ) {
    return false;
  }

  const hoursElapsed =
    (Date.now() - new Date(ticket.createdAt).getTime()) /
    (1000 * 60 * 60);

  switch (ticket.priority) {
    case "urgent":
      return hoursElapsed > 2;

    case "high":
      return hoursElapsed > 4;

    case "medium":
      return hoursElapsed > 24;

    case "low":
    default:
      return hoursElapsed > 72;
  }
};

// ============================================================
// POST /api/tickets
// Create a new ticket
// Any logged-in user can create a ticket
// ============================================================

const createTicket = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    assignedTeam,
  } = req.body;

  if (!title || !description) {
    throw new ApiError(
      400,
      "Title and description are required"
    );
  }

  // ----------------------------------------------------------
  // Default AI classification values
  // ----------------------------------------------------------

  let category = "other";
  let priority = "medium";
  let aiSummary = "";
  let aiConfidence = 0;
  let aiReason = "";

  // ----------------------------------------------------------
  // AI classification
  // ----------------------------------------------------------

  try {
    const classification = await classifyTicket(
      title,
      description
    );

    category = classification.category;
    priority = classification.priority;
    aiSummary = classification.summary;

    // AI confidence
    aiConfidence =
      typeof classification.confidence === "number"
        ? Math.min(
            Math.max(classification.confidence, 0),
            1
          )
        : 0;

    // AI classification reason
    aiReason =
      typeof classification.reason === "string"
        ? classification.reason.slice(0, 200)
        : "";

  } catch (err) {
    console.error(
      "Groq classification failed, using defaults:",
      err.message
    );
  }

  // ----------------------------------------------------------
  // Create ticket
  // ----------------------------------------------------------

  const ticket = await Ticket.create({
    title,
    description,

    // AI classification
    category,
    priority,
    aiSummary,
    aiConfidence,
    aiReason,

    // Assignment
    assignedTeam: assignedTeam || null,
    createdBy: req.user._id,

    // Initial status
    status: "open",

    // No agent assigned initially
    assignedAgent: null,

    // Resolution information
    resolution: "",
    resolvedAt: null,
    resolvedBy: null,
    closedAt: null,
    closedBy: null,
  });

  // ----------------------------------------------------------
  // Send ticket to n8n
  // ----------------------------------------------------------

  if (process.env.N8N_WEBHOOK_URL) {
    fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id: ticket._id,
        category: ticket.category,
        priority: ticket.priority,
        title: ticket.title,
      }),
    }).catch((err) => {
      console.error(
        "Failed to send webhook to n8n:",
        err.message
      );
    });
  }

  // ----------------------------------------------------------
  // Response
  // ----------------------------------------------------------

  res.status(201).json({
    success: true,
    ticket,
  });
});

// ============================================================
// GET /api/tickets
// Role-aware ticket listing
// ============================================================

const getTickets = asyncHandler(async (req, res) => {
  let filter = {};

  // ----------------------------------------------------------
  // USER
  // Users can only see their own tickets
  // ----------------------------------------------------------

  if (req.user.role === "user") {
    filter = {
      createdBy: req.user._id,
    };
  }

  // ----------------------------------------------------------
  // AGENT
  // Agents can only see tickets belonging to their team
  // ----------------------------------------------------------

  else if (req.user.role === "agent") {
    filter = {
      assignedTeam: req.user.team,
    };
  }

  // ----------------------------------------------------------
  // TEAM LEAD
  // Team leads can only see tickets belonging to their team
  // ----------------------------------------------------------

  else if (req.user.role === "teamLead") {
    filter = {
      assignedTeam: req.user.team,
    };
  }

  // ----------------------------------------------------------
  // ADMIN
  // Admin sees everything
  // ----------------------------------------------------------

  // admin => no filter

  const tickets = await Ticket.find(filter)
    .populate("createdBy", "name email")
    .populate("assignedAgent", "name email")
    .populate("assignedTeam", "name")
    .populate("resolvedBy", "name email")
    .populate("closedBy", "name email")
    .sort({ createdAt: -1 });

  // ----------------------------------------------------------
  // Add dynamic SLA information
  // ----------------------------------------------------------

  const ticketsWithSla = tickets.map((ticket) => {
    const ticketObject = ticket.toObject();

    ticketObject.isSlaBreached =
      isTicketSlaBreached(ticket);

    return ticketObject;
  });

  res.status(200).json({
    success: true,
    count: tickets.length,
    tickets: ticketsWithSla,
  });
});

// ============================================================
// GET /api/tickets/breached
// Get SLA breached tickets
// ============================================================

const getBreachedTickets = asyncHandler(
  async (req, res) => {
    const tickets = await Ticket.find({
      status: {
        $nin: ["resolved", "closed"],
      },
    })
      .populate("createdBy", "name email")
      .populate("assignedAgent", "name email")
      .populate("assignedTeam", "name")
      .sort({ createdAt: -1 });

    const breached = tickets
      .filter(isTicketSlaBreached)
      .map((ticket) => {
        const ticketObject = ticket.toObject();

        ticketObject.isSlaBreached = true;

        return ticketObject;
      });

    res.status(200).json(breached);
  }
);

// ============================================================
// GET /api/tickets/:id
// Get single ticket
// ============================================================

const getTicketById = asyncHandler(
  async (req, res) => {
    const ticket = await Ticket.findById(
      req.params.id
    )
      .populate("createdBy", "name email")
      .populate("assignedAgent", "name email")
      .populate("assignedTeam", "name")
      .populate("resolvedBy", "name email")
      .populate("closedBy", "name email");

    if (!ticket) {
      throw new ApiError(
        404,
        "Ticket not found"
      );
    }

    // --------------------------------------------------------
    // USER ACCESS
    // --------------------------------------------------------

    if (req.user.role === "user") {
      const isOwner =
        ticket.createdBy._id.toString() ===
        req.user._id.toString();

      if (!isOwner) {
        throw new ApiError(
          403,
          "You do not have access to this ticket"
        );
      }
    }

    // --------------------------------------------------------
    // AGENT ACCESS
    // --------------------------------------------------------

    if (req.user.role === "agent") {
      const belongsToAgentTeam =
        ticket.assignedTeam &&
        req.user.team &&
        ticket.assignedTeam._id.toString() ===
          req.user.team.toString();

      if (!belongsToAgentTeam) {
        throw new ApiError(
          403,
          "This ticket is not assigned to your team"
        );
      }
    }

    // --------------------------------------------------------
    // TEAM LEAD ACCESS
    // --------------------------------------------------------

    if (req.user.role === "teamLead") {
      const belongsToLeadTeam =
        ticket.assignedTeam &&
        req.user.team &&
        ticket.assignedTeam._id.toString() ===
          req.user.team.toString();

      if (!belongsToLeadTeam) {
        throw new ApiError(
          403,
          "This ticket is not assigned to your team"
        );
      }
    }

    const ticketObject = ticket.toObject();

    ticketObject.isSlaBreached =
      isTicketSlaBreached(ticket);

    res.status(200).json({
      success: true,
      ticket: ticketObject,
    });
  }
);

// ============================================================
// PATCH /api/tickets/:id
//
// Agent / Team Lead / Admin can update ticket
//
// Supported:
// - status
// - assignedAgent
// - priority
// - resolution
//
// Status workflow:
//
// open
//   ↓
// in-progress
//   ↓
// waiting-for-user
//   ↓
// resolved
//   ↓
// closed
// ============================================================

const updateTicket = asyncHandler(
  async (req, res) => {
    const {
      status,
      assignedAgent,
      priority,
      resolution,
    } = req.body;

    // --------------------------------------------------------
    // Find ticket
    // --------------------------------------------------------

    const ticket = await Ticket.findById(
      req.params.id
    );

    if (!ticket) {
      throw new ApiError(
        404,
        "Ticket not found"
      );
    }

    // --------------------------------------------------------
    // AGENT TEAM PROTECTION
    // --------------------------------------------------------

    if (req.user.role === "agent") {
      if (
        !ticket.assignedTeam ||
        !req.user.team ||
        ticket.assignedTeam.toString() !==
          req.user.team.toString()
      ) {
        throw new ApiError(
          403,
          "This ticket is not assigned to your team"
        );
      }
    }

    // --------------------------------------------------------
    // TEAM LEAD TEAM PROTECTION
    // --------------------------------------------------------

    if (req.user.role === "teamLead") {
      if (
        !ticket.assignedTeam ||
        !req.user.team ||
        ticket.assignedTeam.toString() !==
          req.user.team.toString()
      ) {
        throw new ApiError(
          403,
          "This ticket is not assigned to your team"
        );
      }
    }

    // ========================================================
    // STATUS VALIDATION
    // ========================================================

    const allowedStatuses = [
      "open",
      "in-progress",
      "waiting-for-user",
      "resolved",
      "closed",
    ];

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      throw new ApiError(
        400,
        `Invalid status. Allowed values: ${allowedStatuses.join(
          ", "
        )}`
      );
    }

    // ========================================================
    // UPDATE BASIC FIELDS
    // ========================================================

    if (status !== undefined) {
      ticket.status = status;
    }

    // --------------------------------------------------------
    // Priority
    // --------------------------------------------------------

    if (priority !== undefined) {
      const allowedPriorities = [
        "low",
        "medium",
        "high",
        "urgent",
      ];

      if (
        !allowedPriorities.includes(priority)
      ) {
        throw new ApiError(
          400,
          "Invalid priority"
        );
      }

      ticket.priority = priority;
    }

    // --------------------------------------------------------
    // Assigned Agent
    // --------------------------------------------------------

    if (assignedAgent !== undefined) {
      ticket.assignedAgent =
        assignedAgent || null;
    }

    // ========================================================
    // RESOLUTION
    // ========================================================

    if (resolution !== undefined) {
      ticket.resolution = resolution;
    }

    // ========================================================
    // WHEN TICKET BECOMES RESOLVED
    // ========================================================

    if (status === "resolved") {
      const finalResolution =
        resolution !== undefined
          ? resolution
          : ticket.resolution;

      if (!finalResolution?.trim()) {
        throw new ApiError(
          400,
          "Please provide a resolution before resolving the ticket"
        );
      }

      ticket.resolution =
        finalResolution.trim();

      ticket.resolvedAt = new Date();

      ticket.resolvedBy = req.user._id;

      // If ticket was previously closed,
      // remove closed information.
      ticket.closedAt = null;
      ticket.closedBy = null;
    }

    // ========================================================
    // WHEN TICKET BECOMES CLOSED
    // ========================================================

    if (status === "closed") {
      // A ticket should be resolved before closing
      if (
        ticket.status !== "resolved" &&
        !ticket.resolvedAt
      ) {
        throw new ApiError(
          400,
          "Ticket must be resolved before it can be closed"
        );
      }

      ticket.closedAt = new Date();

      ticket.closedBy = req.user._id;
    }

    // ========================================================
    // IF TICKET MOVES BACK FROM RESOLVED
    // ========================================================

    if (
      status &&
      status !== "resolved" &&
      status !== "closed"
    ) {
      ticket.resolvedAt = null;
      ticket.resolvedBy = null;
    }

    // ========================================================
    // SAVE
    // ========================================================

    await ticket.save();

    // ========================================================
    // RETURN POPULATED TICKET
    // ========================================================

    const updatedTicket =
      await Ticket.findById(ticket._id)
        .populate(
          "createdBy",
          "name email"
        )
        .populate(
          "assignedAgent",
          "name email"
        )
        .populate(
          "assignedTeam",
          "name"
        )
        .populate(
          "resolvedBy",
          "name email"
        )
        .populate(
          "closedBy",
          "name email"
        );

    const ticketObject =
      updatedTicket.toObject();

    ticketObject.isSlaBreached =
      isTicketSlaBreached(
        updatedTicket
      );

    res.status(200).json({
      success: true,
      message:
        "Ticket updated successfully",
      ticket: ticketObject,
    });
  }
);

// ============================================================
// DELETE /api/tickets/:id
// Admin only
// ============================================================

const deleteTicket = asyncHandler(
  async (req, res) => {
    const ticket =
      await Ticket.findById(
        req.params.id
      );

    if (!ticket) {
      throw new ApiError(
        404,
        "Ticket not found"
      );
    }

    await ticket.deleteOne();

    res.status(200).json({
      success: true,
      message: "Ticket deleted",
    });
  }
);

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  getBreachedTickets,
  deleteTicket,
};