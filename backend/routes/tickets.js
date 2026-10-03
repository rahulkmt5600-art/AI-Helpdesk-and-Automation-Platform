const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  getBreachedTickets,
  deleteTicket,
} = require("../controllers/ticketController");
const { protect, authorize, protectOrApiKey } = require("../middleware/auth");

// Public/API-Key endpoint for cron jobs (or fallback to authenticated users)
router.get("/breached", protectOrApiKey, getBreachedTickets);

// Every ticket route below requires a logged-in user, so protect() applies to all.
router.use(protect);

router.route("/").post(createTicket).get(getTickets);

router
  .route("/:id")
  .get(getTicketById)
  .patch(authorize("agent", "teamLead", "admin"), updateTicket)
  .delete(authorize("admin"), deleteTicket);

module.exports = router;
