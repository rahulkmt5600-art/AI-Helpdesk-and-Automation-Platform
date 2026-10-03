import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PriorityBadge } from "../components/StatusBadge";
import SearchFilterBar from "../components/SearchFilterBar";

export default function AgentDashboard() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);

  // --------------------------------------------------
  // LOAD TEAM TICKETS
  // --------------------------------------------------

  const loadTickets = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get("/tickets");

      setTickets(res.data.tickets || []);
    } catch (error) {
      console.error("Failed to load team tickets:", error);

      alert(
        error.response?.data?.message ||
          "Unable to load team tickets."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // --------------------------------------------------
  // UPDATE TICKET STATUS
  // --------------------------------------------------

  const updateStatus = async (ticket, status) => {
    if (!ticket?._id) return;

    // Prevent unnecessary API call
    if (ticket.status === status) return;

    // Resolution is required by the backend before resolving
    if (status === "resolved" && !ticket.resolution?.trim()) {
      alert(
        "Please open the ticket and add a resolution note before marking it as Resolved."
      );

      return;
    }

    // Closing is only allowed after resolution
    if (status === "closed" && ticket.status !== "resolved") {
      alert(
        "A ticket must be Resolved before it can be Closed."
      );

      return;
    }

    try {
      setUpdatingTicketId(ticket._id);

      await api.patch(`/tickets/${ticket._id}`, {
        status,
      });

      // Refresh from backend so resolvedAt, closedAt,
      // resolvedBy, closedBy, etc. remain accurate.
      await loadTickets(true);
    } catch (error) {
      console.error("Failed to update ticket status:", error);

      alert(
        error.response?.data?.message ||
          "Unable to update ticket status."
      );
    } finally {
      setUpdatingTicketId(null);
    }
  };

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const stats = useMemo(() => {
    return {
      total: tickets.length,

      open: tickets.filter(
        (ticket) => ticket.status === "open"
      ).length,

      inProgress: tickets.filter(
        (ticket) => ticket.status === "in-progress"
      ).length,

      waitingForUser: tickets.filter(
        (ticket) => ticket.status === "waiting-for-user"
      ).length,

      resolved: tickets.filter(
        (ticket) => ticket.status === "resolved"
      ).length,

      closed: tickets.filter(
        (ticket) => ticket.status === "closed"
      ).length,

      breached: tickets.filter(
        (ticket) => ticket.isSlaBreached
      ).length,

      urgent: tickets.filter(
        (ticket) => ticket.priority === "urgent"
      ).length,
    };
  }, [tickets]);

  // --------------------------------------------------
  // SEARCH + FILTER
  // --------------------------------------------------

  const visibleTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const query = searchQuery.toLowerCase().trim();

      const titleMatch = ticket.title
        ?.toLowerCase()
        .includes(query);

      const descriptionMatch = ticket.description
        ?.toLowerCase()
        .includes(query);

      const requesterMatch = ticket.createdBy?.name
        ?.toLowerCase()
        .includes(query);

      const ticketIdMatch = ticket._id
        ?.slice(-6)
        .toLowerCase()
        .includes(query);

      const searchMatch =
        !query ||
        titleMatch ||
        descriptionMatch ||
        requesterMatch ||
        ticketIdMatch;

      const statusMatch =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(ticket.status);

      const priorityMatch =
        selectedPriorities.length === 0 ||
        selectedPriorities.includes(ticket.priority);

      return (
        searchMatch &&
        statusMatch &&
        priorityMatch
      );
    });
  }, [
    tickets,
    searchQuery,
    selectedStatuses,
    selectedPriorities,
  ]);

  // --------------------------------------------------
  // TEAM NAME
  // --------------------------------------------------

  const teamName =
    user?.team?.name ||
    tickets.find((ticket) => ticket.assignedTeam?.name)
      ?.assignedTeam?.name ||
    "Your Team";

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="page-loader">
        Loading team dashboard…
      </div>
    );
  }

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

  return (
    <div className="page team-dashboard">

      {/* HEADER */}
      <div className="team-dashboard-header">
        <div>
          <div className="team-eyebrow">
            TEAM SUPPORT
          </div>

          <h1>{teamName}</h1>

          <p className="page-subtitle">
            Manage and resolve tickets assigned to your team.
          </p>
        </div>

        <button
          className="btn btn-ghost"
          onClick={() => loadTickets(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* PRIMARY STATS */}
      <div className="team-stat-grid">

        {/* TOTAL */}
        <div className="team-stat-card">
          <div className="team-stat-icon blue">
            #
          </div>

          <div>
            <div className="team-stat-number">
              {stats.total}
            </div>

            <div className="team-stat-label">
              Total Tickets
            </div>
          </div>
        </div>

        {/* OPEN */}
        <div className="team-stat-card">
          <div className="team-stat-icon blue">
            ●
          </div>

          <div>
            <div className="team-stat-number">
              {stats.open}
            </div>

            <div className="team-stat-label">
              Open
            </div>
          </div>
        </div>

        {/* IN PROGRESS */}
        <div className="team-stat-card">
          <div className="team-stat-icon orange">
            →
          </div>

          <div>
            <div className="team-stat-number">
              {stats.inProgress}
            </div>

            <div className="team-stat-label">
              In Progress
            </div>
          </div>
        </div>

        {/* RESOLVED */}
        <div className="team-stat-card">
          <div className="team-stat-icon green">
            ✓
          </div>

          <div>
            <div className="team-stat-number">
              {stats.resolved}
            </div>

            <div className="team-stat-label">
              Resolved
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY STATS */}
      <div className="team-secondary-stats">

        <div>
          <span>Waiting for User</span>
          <strong>
            {stats.waitingForUser}
          </strong>
        </div>

        <div>
          <span>Closed</span>
          <strong>
            {stats.closed}
          </strong>
        </div>

        <div>
          <span>Urgent Tickets</span>
          <strong>
            {stats.urgent}
          </strong>
        </div>

        <div>
          <span>SLA Breached</span>
          <strong
            className={
              stats.breached > 0
                ? "danger-text"
                : ""
            }
          >
            {stats.breached}
          </strong>
        </div>

        <div>
          <span>Showing</span>
          <strong>
            {visibleTickets.length}
          </strong>
        </div>

      </div>

      {/* SEARCH / FILTERS */}
      <SearchFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        selectedPriorities={selectedPriorities}
        setSelectedPriorities={setSelectedPriorities}
      />

      {/* TICKET TABLE */}
      {visibleTickets.length === 0 ? (
        <div className="empty-state team-empty-state">

          <div className="team-empty-icon">
            ✓
          </div>

          <p>
            No tickets found
          </p>

          <span>
            There are no tickets matching your current filters.
          </span>

        </div>
      ) : (
        <div className="team-ticket-panel">

          {/* TABLE HEADER */}
          <div className="team-ticket-header">

            <div>
              <h2>
                Team Tickets
              </h2>

              <p>
                Tickets currently assigned to {teamName}.
              </p>
            </div>

            <span className="ticket-count">
              {visibleTickets.length} tickets
            </span>

          </div>

          {/* TABLE */}
          <div className="team-ticket-table-wrapper">

            <table className="table team-ticket-table">

              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requester</th>
                  <th>AI Triage</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Update</th>
                </tr>
              </thead>

              <tbody>

                {visibleTickets.map((ticket) => (

                  <tr key={ticket._id}>

                    {/* TICKET */}
                    <td>
                      <Link
                        to={`/tickets/${ticket._id}`}
                        className="table-link"
                      >

                        <div className="table-title">
                          {ticket.title}
                        </div>

                        <div className="table-id">
                          #
                          {ticket._id
                            .slice(-6)
                            .toUpperCase()}
                          {" · "}
                          {ticket.category}
                        </div>

                        {ticket.aiSummary && (
                          <div className="team-ai-summary">
                            AI: {ticket.aiSummary}
                          </div>
                        )}

                      </Link>
                    </td>

                    {/* REQUESTER */}
                    <td>
                      <div className="requester-cell">

                        <div className="requester-avatar">
                          {ticket.createdBy?.name
                            ?.charAt(0)
                            ?.toUpperCase() || "U"}
                        </div>

                        <div>

                          <div className="requester-name">
                            {ticket.createdBy?.name ||
                              "Unknown"}
                          </div>

                          <div className="requester-email">
                            {ticket.createdBy?.email || ""}
                          </div>

                        </div>

                      </div>
                    </td>
                    
                    {/* AI TRIAGE */}
                    <td>
                      {ticket.aiConfidence > 0 ? (
                        <div className="team-ai-triage">

                          <div className="team-ai-confidence">
                            {Math.round(ticket.aiConfidence * 100)}%
                          </div>

                          <div className="team-ai-category">
                            {ticket.category}
                          </div>

                          {ticket.aiReason && (
                            <div
                              className="team-ai-reason"
                              title={ticket.aiReason}
                            >
                              {ticket.aiReason}
                            </div>
                          )}

                        </div>
                      ) : (
                        <span className="team-ai-pending">
                          Not available
                        </span>
                      )}
                    </td>
                    {/* PRIORITY */}
                    <td>
                      <PriorityBadge
                        priority={ticket.priority}
                      />
                    </td>

                    {/* STATUS */}
                    <td>
                      <StatusBadge
                        status={ticket.status}
                      />
                    </td>

                    {/* SLA */}
                    <td>

                      {ticket.isSlaBreached ? (
                        <span className="sla-status breached">
                          SLA Breached
                        </span>
                      ) : (
                        <span className="sla-status healthy">
                          Within SLA
                        </span>
                      )}

                    </td>

                    {/* UPDATE */}
                    <td>

                      <select
                        value={ticket.status}
                        onChange={(event) =>
                          updateStatus(
                            ticket,
                            event.target.value
                          )
                        }
                        disabled={
                          updatingTicketId === ticket._id
                        }
                        className="table-select"
                      >

                        <option value="open">
                          Open
                        </option>

                        <option value="in-progress">
                          In Progress
                        </option>

                        <option value="waiting-for-user">
                          Waiting for User
                        </option>

                        <option value="resolved">
                          Resolved
                        </option>

                        <option value="closed">
                          Closed
                        </option>

                      </select>

                      {updatingTicketId === ticket._id && (
                        <div className="small-loading">
                          Updating…
                        </div>
                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>
      )}

    </div>
  );
}