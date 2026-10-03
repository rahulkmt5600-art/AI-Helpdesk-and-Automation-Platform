import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import {
  PriorityBadge,
  StatusBadge,
} from "../components/StatusBadge";

const STATUS_OPTIONS = [
  {
    value: "open",
    label: "Open",
  },
  {
    value: "in-progress",
    label: "In Progress",
  },
  {
    value: "waiting-for-user",
    label: "Waiting for User",
  },
  {
    value: "resolved",
    label: "Resolved",
  },
  {
    value: "closed",
    label: "Closed",
  },
];

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const [resolution, setResolution] = useState("");
  const [savingResolution, setSavingResolution] =
    useState(false);
  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  // AI Reply
  const [aiReply, setAiReply] = useState("");
  const [generatingReply, setGeneratingReply] =
    useState(false);

  // RAG Knowledge Base articles
  const [ragArticles, setRagArticles] = useState([]);

  const [deleting, setDeleting] = useState(false);

  // --------------------------------------------------
// TICKET CONVERSATION
// --------------------------------------------------

const [comments, setComments] = useState([]);
const [commentMessage, setCommentMessage] = useState("");
const [loadingComments, setLoadingComments] = useState(false);
const [sendingComment, setSendingComment] = useState(false);

  // --------------------------------------------------
  // LOAD TICKET
  // --------------------------------------------------

  const loadTicket = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/tickets/${id}`);

      const loadedTicket = res.data.ticket;

      setTicket(loadedTicket);
      setResolution(loadedTicket.resolution || "");
    } catch (error) {
      console.error(
        "Failed to load ticket:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to load ticket."
      );

      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
    loadComments();
  }, [id]);
  // --------------------------------------------------
// LOAD TICKET COMMENTS
// --------------------------------------------------

  const loadComments = async () => {
    try {
      setLoadingComments(true);

      const res = await api.get(
        `/tickets/${id}/comments`
      );

      setComments(res.data.comments || []);
    } catch (error) {
      console.error(
        "Failed to load ticket comments:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to load ticket conversation."
      );
    } finally {
      setLoadingComments(false);
    }
  };
   
  const sendComment = async () => {
    if (!commentMessage.trim()) {
      alert("Please enter a message.");
      return;
    }

    if (ticket?.status === "closed") {
      alert(
        "This ticket is closed and cannot receive new replies."
      );
      return;
    }

    try {
      setSendingComment(true);

      await api.post(
        `/tickets/${id}/comments`,
        {
        message: commentMessage.trim(),
        }
      );

      setCommentMessage("");

      await loadComments();
      await loadTicket();
    } catch (error) {
      console.error(
        "Failed to send reply:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to send reply."
      );
    } finally {
      setSendingComment(false);
    }
  };
  // --------------------------------------------------
  // UPDATE STATUS
  // --------------------------------------------------

  const updateStatus = async (status) => {
    if (!ticket) return;

    if (ticket.status === status) {
      return;
    }

    // Resolution is required before resolving
    if (status === "resolved") {
      if (!resolution.trim()) {
        alert(
          "Please add a resolution before marking this ticket as Resolved."
        );
        return;
      }

      try {
        setUpdatingStatus(true);

        // Save resolution first
        await api.patch(`/tickets/${id}`, {
          resolution: resolution.trim(),
        });

        // Then change status
        await api.patch(`/tickets/${id}`, {
          status: "resolved",
        });

        await loadTicket();

        alert("Ticket marked as Resolved.");
      } catch (error) {
        console.error(
          "Failed to resolve ticket:",
          error
        );

        alert(
          error?.response?.data?.message ||
            "Failed to resolve ticket."
        );
      } finally {
        setUpdatingStatus(false);
      }

      return;
    }

    // Closed tickets must already be resolved
    if (status === "closed") {
      if (ticket.status !== "resolved") {
        alert(
          "A ticket can only be Closed after it has been Resolved."
        );
        return;
      }

      try {
        setUpdatingStatus(true);

        await api.patch(`/tickets/${id}`, {
          status: "closed",
        });

        await loadTicket();

        alert("Ticket closed successfully.");
      } catch (error) {
        console.error(
          "Failed to close ticket:",
          error
        );

        alert(
          error?.response?.data?.message ||
            "Failed to close ticket."
        );
      } finally {
        setUpdatingStatus(false);
      }

      return;
    }

    // Normal status update
    try {
      setUpdatingStatus(true);

      await api.patch(`/tickets/${id}`, {
        status,
      });

      await loadTicket();
    } catch (error) {
      console.error(
        "Failed to update status:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to update ticket status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // --------------------------------------------------
  // SAVE RESOLUTION
  // --------------------------------------------------
  const saveResolution = async () => {
    if (!resolution.trim()) {
      alert("Please enter a resolution.");
      return;
    }

    try {
      setSavingResolution(true);

      // Save resolution and automatically mark ticket as resolved
      await api.patch(`/tickets/${id}`, {
        resolution: resolution.trim(),
        status: "resolved",
      });

      await loadTicket();

      alert("Resolution saved and ticket marked as Resolved.");
    } catch (error) {
      console.error(
        "Failed to save resolution:",
        error
      );
  
      alert(
        error?.response?.data?.message ||
          "Failed to save resolution."
      );
    } finally {
      setSavingResolution(false);
    }
  };

  // --------------------------------------------------
  // AI SUGGESTED REPLY + RAG
  // --------------------------------------------------

  const generateAiReply = async () => {
    if (!ticket) return;

    try {
      setGeneratingReply(true);

      // Clear previous result
      setAiReply("");
      setRagArticles([]);

      const res = await api.post(
        `/ai/tickets/${id}/suggest-reply`
      );
      const generatedDraft = res.data.draft || "";

      // AI generated draft
      setAiReply(res.data.draft || "");
      setResolution(generatedDraft);
      // Knowledge Base articles used by RAG
      setRagArticles(
        res.data.rag?.articles || []
      );
    } catch (error) {
      console.error(
        "Failed to generate AI reply:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to generate AI reply."
      );
    } finally {
      setGeneratingReply(false);
    }
  };

  // --------------------------------------------------
  // DELETE TICKET
  // --------------------------------------------------

  const deleteTicket = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this ticket?"
      )
    ) {
      return;
    }

    try {
      setDeleting(true);

      await api.delete(`/tickets/${id}`);

      alert("Ticket deleted successfully.");

      navigate("/dashboard");
    } catch (error) {
      console.error(
        "Failed to delete ticket:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to delete ticket."
      );
    } finally {
      setDeleting(false);
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          Loading ticket...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="page">
        <div className="empty-state">
          Ticket not found.
        </div>
      </div>
    );
  }

  const isAgent =
    user?.role === "agent" ||
    user?.role === "teamLead" ||
    user?.role === "admin";

  const isClosed =
    ticket.status === "closed";

  const isResolved =
    ticket.status === "resolved";

  return (
    <div className="page">

      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="page-header">

        <div>

          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <div className="ticket-detail-title">

            <div className="ticket-id">
              Ticket #{ticket._id}
            </div>

            <h1>{ticket.title}</h1>

          </div>

        </div>

        <div className="ticket-detail-badges">

          <StatusBadge
            status={ticket.status}
          />

          <PriorityBadge
            priority={ticket.priority}
          />

        </div>

      </div>

      {/* ==========================================
          TICKET INFORMATION
      ========================================== */}

      <div className="ticket-detail-grid">

        {/* ======================================
            LEFT SIDE
        ====================================== */}

        <div className="ticket-detail-main">

          {/* ======================================
              DESCRIPTION
          ====================================== */}

          <section className="card">

            <div className="card-header">
              <h2>Ticket Description</h2>
            </div>

            <div className="card-body">

              <div className="ticket-description">
                {ticket.description}
              </div>

              {ticket.aiSummary && (
                <div className="ai-summary">

                  <div className="meta-label">
                    AI Summary
                  </div>

                  <p>
                    {ticket.aiSummary}
                  </p>

                </div>
              )}

            </div>

          </section>

          {/* ======================================
              TICKET METADATA
          ====================================== */}

          <section className="card">

            <div className="card-header">
              <h2>Ticket Information</h2>
            </div>

            <div className="card-body">

              <div className="ticket-meta-grid">

                <div className="meta-item">

                  <span className="meta-label">
                    Category
                  </span>

                  <span className="meta-value">
                    {ticket.category
                      ? ticket.category
                          .charAt(0)
                          .toUpperCase() +
                        ticket.category.slice(1)
                      : "Other"}
                  </span>

                </div>

                <div className="meta-item">

                  <span className="meta-label">
                    Priority
                  </span>

                  <span className="meta-value">

                    <PriorityBadge
                      priority={ticket.priority}
                    />

                  </span>

                </div>

                <div className="meta-item">

                  <span className="meta-label">
                    Status
                  </span>

                  <span className="meta-value">

                    <StatusBadge
                      status={ticket.status}
                    />

                  </span>

                </div>

                <div className="meta-item">

                  <span className="meta-label">
                    Created
                  </span>

                  <span className="meta-value">
                    {ticket.createdAt
                      ? new Date(
                          ticket.createdAt
                        ).toLocaleString()
                      : "—"}
                  </span>

                </div>

                <div className="meta-item">

                  <span className="meta-label">
                    Assigned Team
                  </span>

                  <span className="meta-value">
                    {ticket.assignedTeam?.name ||
                      "Unassigned"}
                  </span>

                </div>

                <div className="meta-item">

                  <span className="meta-label">
                    Assigned Agent
                  </span>

                  <span className="meta-value">
                    {ticket.assignedAgent?.name ||
                      "Unassigned"}
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* ======================================
              AI TRIAGE ANALYSIS
          ====================================== */}

          <section className="card">

            <div className="card-header">

              <div>

                <h2>
                  AI Triage Analysis
                </h2>

                <p className="card-subtitle">
                  Automatic classification performed when
                  the ticket was created.
                </p>

              </div>

              <span className="ai-triage-badge">
                AI
              </span>

            </div>

            <div className="card-body">

              {ticket.aiSummary ? (

                <div className="ai-triage-content">

                  {/* AI SUMMARY */}

                  <div className="ai-triage-summary">

                    <span className="meta-label">
                      AI Summary
                    </span>

                    <p>
                      {ticket.aiSummary}
                    </p>

                  </div>

                  {/* AI CLASSIFICATION */}

                  <div className="ai-triage-grid">

                    <div className="ai-triage-item">

                      <span className="meta-label">
                        Category
                      </span>

                      <span className="ai-triage-value">
                        {ticket.category
                          ? ticket.category
                              .charAt(0)
                              .toUpperCase() +
                            ticket.category.slice(1)
                          : "Other"}
                      </span>

                    </div>

                    <div className="ai-triage-item">

                      <span className="meta-label">
                        Priority
                      </span>

                      <span className="ai-triage-value">

                        <PriorityBadge
                          priority={ticket.priority}
                        />

                      </span>

                    </div>

                    <div className="ai-triage-item">

                      <span className="meta-label">
                        Team
                      </span>

                      <span className="ai-triage-value">
                        {ticket.assignedTeam?.name ||
                          "Pending Assignment"}
                      </span>

                    </div>

                    <div className="ai-triage-item">

                      <span className="meta-label">
                        Agent
                      </span>

                      <span className="ai-triage-value">
                        {ticket.assignedAgent?.name ||
                          "Pending Assignment"}
                      </span>

                    </div>

                  </div>

                  {/* AI REASON + CONFIDENCE */}

                  {ticket.aiReason && (

                    <div className="ai-triage-reason">

                      <div className="ai-triage-reason-header">

                        <span className="meta-label">
                          Why AI classified this ticket
                        </span>

                        {typeof ticket.aiConfidence ===
                          "number" && (
                          <span className="ai-confidence">
                            {Math.round(
                              ticket.aiConfidence * 100
                            )}
                            % confidence
                          </span>
                        )}

                      </div>

                      <p>
                        {ticket.aiReason}
                      </p>

                    </div>

                  )}

                </div>

              ) : (

                <div className="empty-state">
                  AI triage information is not available
                  for this ticket.
                </div>

              )}

            </div>

          </section>
          
          {/* ======================================
              TICKET CONVERSATION
          ====================================== */}

          <section className="card">

            <div className="card-header">

              <div>

                <h2>Conversation</h2>

                <p className="card-subtitle">
                  Communicate with the requester about this ticket.
                </p>

              </div>

            </div>

            <div className="card-body">

              {/* LOADING */}

              {loadingComments ? (

                <div className="small-loading">
                  Loading conversation...
                </div>

              ) : comments.length === 0 ? (

                <div className="empty-state">
                  No replies yet. Start the conversation below.
                </div>

              ) : (

                <div className="ticket-conversation">

                  {comments.map((comment) => {

                    const isCurrentUser =
                      comment.author?._id === user?._id;

                    
                      

                    return (

                      <div
                        key={comment._id}
                        className={`conversation-message ${
                          isCurrentUser
                            ? "current-user"
                            : ""
                        }`}
                      >

                        <div className="conversation-message-header">

                          <div>

                            <strong>
                              {comment.author?.name ||
                                "Unknown User"}
                            </strong>

                            <span className="conversation-role">
                              {comment.author?.role === "teamLead"
                                ? "Team Lead"
                                : comment.author?.role === "agent"
                                ? "Agent"
                                : comment.author?.role === "admin"
                                ? "Admin"
                                : "User"}
                            </span>

                          </div>

                          <span className="conversation-time">
                            {comment.createdAt
                              ? new Date(
                                  comment.createdAt
                                ).toLocaleString()
                              : ""}
                          </span>

                        </div>

                        <div className="conversation-message-body">

                          {comment.message}

                        </div>

                      </div>

                    );
                  })}

                </div>

              )}

              {/* REPLY BOX */}

              {!isClosed && (

                <div className="conversation-reply">

                  <label
                    className="form-label"
                    htmlFor="commentMessage"
                  >
                    Your Reply
                  </label>

                  <textarea
                      id="commentMessage"
                      className="form-textarea"
                      rows="4"
                      value={commentMessage}
                      onChange={(e) =>
                        setCommentMessage(e.target.value)
                      }
                      placeholder={
                        isAgent
                          ? "Write a response or solution for the requester..."
                          : "Explain what happened after trying the solution..."
                     }
                     disabled={sendingComment}
                  />

                  <div className="conversation-reply-actions">
 
                    <span className="conversation-status-help">

                      {isAgent
                        ? "Sending a reply will put the ticket in Waiting for User."
                        : "Sending a reply will put the ticket back In Progress."}

                  </span>

                  <button
                    className="btn btn-primary"
                    onClick={sendComment}
                    disabled={
                      sendingComment ||
                      !commentMessage.trim()
                    }
                  >
                    {sendingComment
                      ? "Sending..."
                      : "Send Reply"}
                  </button>

                </div>

              </div>

            )}

            {isClosed && (

              <div className="conversation-closed">

                This ticket is closed. No further replies can be added.

              </div>

              )}

            </div>

          </section>

          {/* ======================================
              RESOLUTION
          ====================================== */}

          <section className="card">

            <div className="card-header">

              <div>

                <h2>Resolution</h2>

                <p className="card-subtitle">
                  Add the solution provided for this ticket.
                </p>

              </div>

            </div>

            <div className="card-body">

              {/* READ-ONLY RESOLUTION */}

              {(isResolved || isClosed) &&
                ticket.resolution && (

                  <div className="resolution-box">

                    <div className="meta-label">
                      Resolution Provided
                    </div>

                    <p>
                      {ticket.resolution}
                    </p>

                    <div className="resolution-by">

                      {ticket.resolvedBy?.name && (
                        <>
                          Resolved by{" "}
                          <strong>
                            {ticket.resolvedBy.name}
                          </strong>
                        </>
                      )}

                      {ticket.resolvedAt && (
                        <>
                          {" • "}
                          {new Date(
                            ticket.resolvedAt
                          ).toLocaleString()}
                        </>
                      )}

                    </div>

                  </div>

                )}

              {/* EDITABLE RESOLUTION */}

              {isAgent && !isClosed && (

                <div className="resolution-editor">

                  <label
                    className="form-label"
                    htmlFor="resolution"
                  >
                    Resolution Note
                  </label>

                  <textarea
                    id="resolution"
                    className="form-textarea"
                    rows="6"
                    value={resolution}
                    onChange={(e) =>
                      setResolution(
                        e.target.value
                      )
                    }
                    placeholder="Describe how the issue was resolved..."
                    disabled={
                      savingResolution ||
                      updatingStatus
                    }
                  />

                  <div className="resolution-actions">

                    <button
                      className="btn btn-primary"
                      onClick={saveResolution}
                      disabled={
                        savingResolution ||
                        updatingStatus ||
                        !resolution.trim()
                      }
                    >
                      {savingResolution
                        ? "Saving..."
                        : "Save Resolution"}
                    </button>

                  </div>

                </div>

              )}

              {/* RESOLUTION NOT AVAILABLE */}

              {!ticket.resolution &&
                (isResolved || isClosed) && (

                  <div className="empty-state">
                    No resolution note was added.
                  </div>

                )}

            </div>

          </section>

          {/* ======================================
              AI REPLY + RAG
          ====================================== */}

          {isAgent && (

            <section className="card">

              <div className="card-header">

                <div>

                  <h2>
                    AI Suggested Reply
                  </h2>

                  <p className="card-subtitle">
                    Generate a response for the requester using
                    the Knowledge Base.
                  </p>

                </div>

                <button
                  className="btn btn-secondary"
                  onClick={generateAiReply}
                  disabled={generatingReply}
                >
                  {generatingReply
                    ? "Generating..."
                    : "Generate Reply"}
                </button>

              </div>

              <div className="card-body">

                {/* AI RESPONSE */}

                {aiReply ? (

                  <>

                    <div className="ai-reply-box">
                      {aiReply}
                    </div>

                    {/* RAG SOURCES */}

                    {ragArticles.length > 0 && (

                      <div className="rag-sources">

                        <div className="rag-sources-header">

                          <div>

                            <h3>
                              Knowledge Used
                            </h3>

                            <p>
                              {ragArticles.length} knowledge article
                              {ragArticles.length !== 1
                                ? "s"
                                : ""}{" "}
                              retrieved by RAG
                            </p>

                          </div>

                          <span className="rag-badge">
                            RAG
                          </span>

                        </div>

                        <div className="rag-article-list">

                          {ragArticles.map(
                            (article) => (

                              <div
                                className="rag-article"
                                key={article.id}
                              >

                                <div className="rag-article-icon">
                                  📚
                                </div>

                                <div className="rag-article-content">

                                  <strong>
                                    {article.title}
                                  </strong>

                                  <span>
                                    Category:{" "}
                                    {article.category
                                      ? article.category
                                          .charAt(0)
                                          .toUpperCase() +
                                        article.category.slice(1)
                                      : "Other"}
                                  </span>

                                </div>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}

                  </>

                ) : (

                  <div className="empty-state">

                    Click "Generate Reply" to create
                    an AI-assisted response using the
                    Knowledge Base.

                  </div>

                )}

              </div>

            </section>

          )}

        </div>

        {/* ==========================================
            RIGHT SIDE
        ========================================== */}

        <div className="ticket-detail-sidebar">

          {/* ======================================
              STATUS WORKFLOW
          ====================================== */}

          {isAgent && (

            <section className="card">

              <div className="card-header">

                <div>

                  <h2>
                    Ticket Workflow
                  </h2>

                  <p className="card-subtitle">
                    Update the current ticket status.
                  </p>

                </div>

              </div>

              <div className="card-body">

                <div className="status-workflow">

                  {STATUS_OPTIONS.map(
                    (option, index) => {

                      const isActive =
                        ticket.status ===
                        option.value;

                      return (

                        <div
                          key={option.value}
                          className={`workflow-step ${
                            isActive
                              ? "active"
                              : ""
                          }`}
                        >

                          <button
                            className={`workflow-button ${
                              isActive
                                ? "active"
                                : ""
                            }`}
                            onClick={() =>
                              updateStatus(
                                option.value
                              )
                            }
                            disabled={
                              updatingStatus ||
                              isActive
                            }
                          >

                            <span className="workflow-number">
                              {index + 1}
                            </span>

                            <span>
                              {option.label}
                            </span>

                          </button>

                        </div>

                      );
                    }
                  )}

                </div>

                {updatingStatus && (

                  <div className="small-loading">
                    Updating ticket status...
                  </div>

                )}

                <div className="workflow-help">

                  <strong>
                    Workflow:
                  </strong>

                  <span>
                    Open → In Progress →
                    Waiting for User →
                    Resolved → Closed
                  </span>

                </div>

              </div>

            </section>

          )}

          {/* ======================================
              RESOLUTION INFORMATION
          ====================================== */}

          {ticket.resolvedAt && (

            <section className="card">

              <div className="card-header">
                <h2>Resolution Details</h2>
              </div>

              <div className="card-body">

                <div className="meta-item">

                  <span className="meta-label">
                    Resolved At
                  </span>

                  <span className="meta-value">

                    {new Date(
                      ticket.resolvedAt
                    ).toLocaleString()}

                  </span>

                </div>

                <div className="meta-item">

                  <span className="meta-label">
                    Resolved By
                  </span>

                  <span className="meta-value">
                    {ticket.resolvedBy?.name ||
                      "Agent"}
                  </span>

                </div>

              </div>

            </section>

          )}

          {/* ======================================
              CLOSED INFORMATION
          ====================================== */}

          {ticket.closedAt && (

            <section className="card">

              <div className="card-header">
                <h2>Closure Details</h2>
              </div>

              <div className="card-body">

                <div className="meta-item">

                  <span className="meta-label">
                    Closed At
                  </span>

                  <span className="meta-value">

                    {new Date(
                      ticket.closedAt
                    ).toLocaleString()}

                  </span>

                </div>

                <div className="meta-item">

                  <span className="meta-label">
                    Closed By
                  </span>

                  <span className="meta-value">
                    {ticket.closedBy?.name ||
                      "Agent"}
                  </span>

                </div>

              </div>

            </section>

          )}

          {/* ======================================
              REQUESTER
          ====================================== */}

          <section className="card">

            <div className="card-header">
              <h2>Requester</h2>
            </div>

            <div className="card-body">

              <div className="requester-info">

                <div className="requester-name">
                  {ticket.createdBy?.name ||
                    "Unknown User"}
                </div>

                <div className="requester-email">
                  {ticket.createdBy?.email ||
                    "No email available"}
                </div>

              </div>

            </div>

          </section>

          {/* ======================================
              ADMIN ACTIONS
          ====================================== */}

          {user?.role === "admin" && (

            <section className="card danger-card">

              <div className="card-header">
                <h2>Admin Actions</h2>
              </div>

              <div className="card-body">

                <button
                  className="btn btn-danger"
                  onClick={deleteTicket}
                  disabled={deleting}
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Ticket"}
                </button>

              </div>

            </section>

          )}

        </div>

      </div>

    </div>
  );
}