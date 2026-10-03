import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { PriorityBadge, StatusBadge } from "../components/StatusBadge";

export default function TeamLeadDashboard() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const loadTickets = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get("/tickets");

      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error("Failed to load team tickets:", error);

      alert(
        error.response?.data?.message ||
          "Failed to load team tickets"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const teamName = user?.team?.name || "Team";

  // ------------------------------------------------------------
  // TEAM STATISTICS
  // ------------------------------------------------------------

  const stats = useMemo(() => {
    const total = tickets.length;

    const open = tickets.filter(
      (ticket) => ticket.status === "open"
    ).length;

    const inProgress = tickets.filter(
      (ticket) => ticket.status === "in-progress"
    ).length;

    const waitingForUser = tickets.filter(
      (ticket) => ticket.status === "waiting-for-user"
    ).length;

    const resolved = tickets.filter(
      (ticket) => ticket.status === "resolved"
    ).length;

    const closed = tickets.filter(
      (ticket) => ticket.status === "closed"
    ).length;

    const urgent = tickets.filter(
      (ticket) => ticket.priority === "urgent"
    ).length;

    const slaBreached = tickets.filter(
      (ticket) => ticket.isSlaBreached
    ).length;

    const unassigned = tickets.filter(
      (ticket) => !ticket.assignedAgent
    ).length;

    const active =
      open +
      inProgress +
      waitingForUser;

    return {
      total,
      open,
      inProgress,
      waitingForUser,
      resolved,
      closed,
      urgent,
      slaBreached,
      unassigned,
      active,
    };
  }, [tickets]);

  // ------------------------------------------------------------
  // TEAM HEALTH
  // ------------------------------------------------------------

  const health = useMemo(() => {
    if (tickets.length === 0) {
      return {
        slaRate: 100,
        resolutionRate: 0,
      };
    }

    const withinSla = tickets.length - stats.slaBreached;

    const slaRate = Math.round(
      (withinSla / tickets.length) * 100
    );

    const completed =
      stats.resolved + stats.closed;

    const resolutionRate = Math.round(
      (completed / tickets.length) * 100
    );

    return {
      slaRate,
      resolutionRate,
    };
  }, [tickets, stats]);

  // ------------------------------------------------------------
  // SEARCH + FILTER
  // ------------------------------------------------------------

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !query ||
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.createdBy?.name?.toLowerCase().includes(query) ||
        ticket.assignedAgent?.name?.toLowerCase().includes(query) ||
        ticket._id?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        ticket.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tickets,
    searchQuery,
    statusFilter,
    priorityFilter,
  ]);

  // ------------------------------------------------------------
  // AGENT WORKLOAD
  // ------------------------------------------------------------

  const agentWorkload = useMemo(() => {
    const workload = {};

    tickets.forEach((ticket) => {
      const agent = ticket.assignedAgent;

      if (!agent) {
        return;
      }

      const agentId = agent._id;

      if (!workload[agentId]) {
        workload[agentId] = {
          id: agentId,
          name: agent.name,
          email: agent.email,
          total: 0,
          active: 0,
          open: 0,
          inProgress: 0,
          waitingForUser: 0,
          resolved: 0,
          closed: 0,
        };
      }

      workload[agentId].total += 1;

      if (
        ticket.status === "open" ||
        ticket.status === "in-progress" ||
        ticket.status === "waiting-for-user"
      ) {
        workload[agentId].active += 1;
      }

      if (ticket.status === "open") {
        workload[agentId].open += 1;
      }

      if (ticket.status === "in-progress") {
        workload[agentId].inProgress += 1;
      }

      if (ticket.status === "waiting-for-user") {
        workload[agentId].waitingForUser += 1;
      }

      if (ticket.status === "resolved") {
        workload[agentId].resolved += 1;
      }

      if (ticket.status === "closed") {
        workload[agentId].closed += 1;
      }
    });

    return Object.values(workload).sort(
      (a, b) => b.active - a.active
    );
  }, [tickets]);

  const maxActiveWorkload = Math.max(
    ...agentWorkload.map((agent) => agent.active),
    1
  );

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">
          Loading team dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="page team-lead-page">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="tl-header">
        <div>
          <div className="tl-eyebrow">
            TEAM LEAD DASHBOARD
          </div>

          <div className="tl-title-row">
            <div className="tl-team-icon">
              {teamName.charAt(0).toUpperCase()}
            </div>

            <div>
              <h1>{teamName}</h1>

              <p>
                Monitor team workload, ticket activity
                and SLA performance.
              </p>
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary tl-refresh"
          onClick={() => loadTickets(true)}
          disabled={refreshing}
        >
          <span className="tl-refresh-icon">↻</span>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ====================================================== */}
      {/* PRIMARY STATS */}
      {/* ====================================================== */}

      <section className="tl-stat-grid">

        <div className="tl-stat-card">
          <div className="tl-stat-top">
            <span className="tl-stat-label">
              Total Tickets
            </span>

            <span className="tl-stat-icon blue">
              #
            </span>
          </div>

          <div className="tl-stat-value">
            {stats.total}
          </div>

          <div className="tl-stat-sub">
            All tickets in your team
          </div>
        </div>

        <div className="tl-stat-card">
          <div className="tl-stat-top">
            <span className="tl-stat-label">
              Active
            </span>

            <span className="tl-stat-icon orange">
              ●
            </span>
          </div>

          <div className="tl-stat-value">
            {stats.active}
          </div>

          <div className="tl-stat-sub">
            Open, in progress or waiting
          </div>
        </div>

        <div className="tl-stat-card">
          <div className="tl-stat-top">
            <span className="tl-stat-label">
              Resolved
            </span>

            <span className="tl-stat-icon green">
              ✓
            </span>
          </div>

          <div className="tl-stat-value">
            {stats.resolved + stats.closed}
          </div>

          <div className="tl-stat-sub">
            {health.resolutionRate}% of team tickets
          </div>
        </div>

        <div className="tl-stat-card">
          <div className="tl-stat-top">
            <span className="tl-stat-label">
              SLA Breached
            </span>

            <span className="tl-stat-icon red">
              !
            </span>
          </div>

          <div className="tl-stat-value tl-danger-value">
            {stats.slaBreached}
          </div>

          <div className="tl-stat-sub">
            {health.slaRate}% within SLA
          </div>
        </div>

      </section>

      {/* ====================================================== */}
      {/* OVERVIEW */}
      {/* ====================================================== */}

      <section className="tl-overview-grid">

        {/* TEAM HEALTH */}

        <div className="tl-panel">
          <div className="tl-panel-header">
            <div>
              <div className="tl-section-label">
                TEAM HEALTH
              </div>

              <h2>Performance overview</h2>
            </div>
          </div>

          <div className="tl-health-list">

            <div className="tl-health-item">
              <div className="tl-health-heading">
                <span>Within SLA</span>
                <strong>{health.slaRate}%</strong>
              </div>

              <div className="tl-progress">
                <div
                  className="tl-progress-fill green"
                  style={{
                    width: `${health.slaRate}%`,
                  }}
                />
              </div>
            </div>

            <div className="tl-health-item">
              <div className="tl-health-heading">
                <span>Resolution rate</span>
                <strong>
                  {health.resolutionRate}%
                </strong>
              </div>

              <div className="tl-progress">
                <div
                  className="tl-progress-fill blue"
                  style={{
                    width: `${health.resolutionRate}%`,
                  }}
                />
              </div>
            </div>

            <div className="tl-health-mini-grid">

              <div className="tl-mini-stat">
                <span>Urgent</span>
                <strong className="tl-red">
                  {stats.urgent}
                </strong>
              </div>

              <div className="tl-mini-stat">
                <span>Unassigned</span>
                <strong className="tl-orange">
                  {stats.unassigned}
                </strong>
              </div>

              <div className="tl-mini-stat">
                <span>Waiting</span>
                <strong>
                  {stats.waitingForUser}
                </strong>
              </div>

            </div>
          </div>
        </div>

        {/* AGENT WORKLOAD */}

        <div className="tl-panel">
          <div className="tl-panel-header">
            <div>
              <div className="tl-section-label">
                TEAM PERFORMANCE
              </div>

              <h2>Agent workload</h2>
            </div>

            <span className="tl-count-pill">
              {agentWorkload.length} agents
            </span>
          </div>

          {agentWorkload.length === 0 ? (
            <div className="tl-empty">
              No tickets are currently assigned to agents.
            </div>
          ) : (
            <div className="tl-workload-list">
              {agentWorkload.map((agent) => {
                const percentage = Math.round(
                  (agent.active / maxActiveWorkload) * 100
                );

                return (
                  <div
                    className="tl-agent"
                    key={agent.id}
                  >
                    <div className="tl-agent-top">
                      <div>
                        <strong>{agent.name}</strong>

                        <span>
                          {agent.email}
                        </span>
                      </div>

                      <div className="tl-agent-count">
                        {agent.active}
                        <small> active</small>
                      </div>
                    </div>

                    <div className="tl-progress">
                      <div
                        className="tl-progress-fill blue"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                    <div className="tl-agent-meta">
                      <span>
                        {agent.open} open
                      </span>

                      <span>
                        {agent.inProgress} in progress
                      </span>

                      <span>
                        {agent.waitingForUser} waiting
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </section>

      {/* ====================================================== */}
      {/* TICKETS */}
      {/* ====================================================== */}

      <section className="tl-tickets-panel">

        <div className="tl-panel-header tl-tickets-header">
          <div>
            <div className="tl-section-label">
              TEAM SUPPORT
            </div>

            <h2>Team tickets</h2>

            <p>
              Review and manage tickets assigned to
              {` ${teamName}`}.
            </p>
          </div>

          <div className="tl-ticket-count">
            {filteredTickets.length} / {tickets.length}
          </div>
        </div>

        {/* FILTERS */}

        <div className="tl-filters">

          <div className="tl-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search tickets, requester or agent..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
            />
          </div>

          <select
            className="tl-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">
              All Statuses
            </option>

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

          <select
            className="tl-select"
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value)
            }
          >
            <option value="all">
              All Priorities
            </option>

            <option value="urgent">
              Urgent
            </option>

            <option value="high">
              High
            </option>

            <option value="medium">
              Medium
            </option>

            <option value="low">
              Low
            </option>
          </select>

        </div>

        {/* TABLE */}

        {filteredTickets.length === 0 ? (
          <div className="tl-empty tl-ticket-empty">
            <div className="tl-empty-icon">
              ✓
            </div>

            <strong>
              No tickets found
            </strong>

            <span>
              Try changing your search or filters.
            </span>
          </div>
        ) : (
          <div className="tl-ticket-table-wrap">
            <table className="tl-ticket-table">

              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requester</th>
                  <th>Agent</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>SLA</th>
                </tr>
              </thead>

              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket._id}>

                    <td>
                      <Link
                        to={`/tickets/${ticket._id}`}
                        className="tl-ticket-title"
                      >
                        {ticket.title}
                      </Link>

                      <span className="tl-ticket-id">
                        #{ticket._id.slice(-6)}
                      </span>
                    </td>

                    <td>
                      <span className="tl-requester">
                        {ticket.createdBy?.name ||
                          "Unknown"}
                      </span>
                    </td>

                    <td>
                      {ticket.assignedAgent ? (
                        <div className="tl-agent-cell">
                          <span className="tl-avatar">
                            {ticket.assignedAgent.name
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </span>

                          <span>
                            {ticket.assignedAgent.name}
                          </span>
                        </div>
                      ) : (
                        <span className="tl-unassigned">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td>
                      <PriorityBadge
                        priority={ticket.priority}
                      />
                    </td>

                    <td>
                      <StatusBadge
                        status={ticket.status}
                      />
                    </td>

                    <td>
                      {ticket.isSlaBreached ? (
                        <span className="tl-sla-badge breached">
                          ● Breached
                        </span>
                      ) : (
                        <span className="tl-sla-badge ok">
                          ● Within SLA
                        </span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

      </section>
    </div>
  );
}