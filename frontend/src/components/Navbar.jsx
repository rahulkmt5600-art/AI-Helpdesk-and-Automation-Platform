import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

// Header style top navbar - replaces vertical sidebar layout
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const notificationRef = useRef(null);

  if (!user) return null;

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);

      const res = await api.get("/notifications");

      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load notifications when user logs in
  useEffect(() => {
    loadNotifications();

    // Refresh notifications every 15 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [user?._id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Mark one notification as read
  const markAsRead = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.patch(`/notifications/${notification._id}/read`);

        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id
              ? { ...item, isRead: true }
              : item
          )
        );

        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }

      // Open related ticket
      if (notification.ticket?._id) {
        setShowNotifications(false);
        navigate(`/tickets/${notification.ticket._id}`);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);

      setNotifications((prev) =>
        prev.filter((notification) => notification._id !== notificationId)
      );

      const deletedNotification = notifications.find(
        (notification) => notification._id === notificationId
      );

      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-left">
          <div className="navbar-brand">
            <span className="navbar-brand-mark">D</span>
            <span className="navbar-brand-name">Deskline</span>
          </div>

          <nav className="navbar-nav">
            <NavLink to="/" end className="navbar-link">
              Tickets
            </NavLink>

            {user.role === "admin" && (
              <>
                <NavLink to="/teams" className="navbar-link">
                  Teams
                </NavLink>

                <NavLink to="/users" className="navbar-link">
                  Users
                </NavLink>
              </>
            )}
          </nav>
        </div>

        <div className="navbar-right">
          {/* Notification Bell */}
          <div className="notification-wrapper" ref={notificationRef}>
            <button
              className="notification-button"
              onClick={() =>
                setShowNotifications((previous) => !previous)
              }
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="notification-bell">🔔</span>

              {unreadCount > 0 && (
                <span className="notification-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <div>
                    <h3>Notifications</h3>

                    <span className="notification-unread-text">
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : "All caught up"}
                    </span>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      className="notification-mark-all"
                      onClick={markAllAsRead}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="notification-list">
                  {loadingNotifications ? (
                    <div className="notification-empty">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <div className="notification-empty-icon">🔔</div>
                      <div>No notifications yet</div>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`notification-item ${
                          notification.isRead ? "read" : "unread"
                        }`}
                        onClick={() => markAsRead(notification)}
                      >
                        <div className="notification-item-icon">
                          💬
                        </div>

                        <div className="notification-item-content">
                          <div className="notification-item-top">
                            <strong>{notification.title}</strong>

                            {!notification.isRead && (
                              <span className="notification-unread-dot" />
                            )}
                          </div>

                          <p>{notification.message}</p>

                          <span className="notification-time">
                            {notification.createdAt
                              ? new Date(
                                  notification.createdAt
                                ).toLocaleString()
                              : ""}
                          </span>
                        </div>

                        <button
                          className="notification-delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          title="Delete notification"
                          aria-label="Delete notification"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User */}
          <div className="navbar-user">
            <div className="navbar-user-avatar">
              {user.name?.[0]}
            </div>

            <div className="navbar-user-info">
              <div className="navbar-user-name">{user.name}</div>
              <div className="navbar-user-role">{user.role}</div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-small"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}