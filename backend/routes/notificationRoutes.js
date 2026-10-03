const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/auth");

router.get("/", protect, getNotifications);

router.patch("/read-all", protect, markAllNotificationsRead);

router.patch("/:id/read", protect, markNotificationRead);

router.delete("/:id", protect, deleteNotification);

module.exports = router;