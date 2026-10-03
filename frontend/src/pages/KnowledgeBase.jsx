
import { useEffect, useState } from "react";
import api from "../utils/api";

function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/knowledge");

      setArticles(response.data.articles || []);
    } catch (err) {
      console.error("Knowledge Base error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load knowledge base"
      );
    } finally {
      setLoading(false);
    }
  };

  const searchArticles = async () => {
    try {
      setLoading(true);
      setError("");

      if (!search.trim()) {
        await fetchArticles();
        return;
      }

      const response = await api.get("/knowledge/search", {
        params: {
          q: search,
        },
      });

      setArticles(response.data.articles || []);
    } catch (err) {
      console.error("Knowledge search error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to search knowledge base"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Knowledge Base</h1>
          <p>
            Search troubleshooting guides and solutions.
          </p>
        </div>
      </div>

      <div className="knowledge-search">
        <input
          type="text"
          placeholder="Search Wi-Fi, VPN, password, printer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              searchArticles();
            }
          }}
        />

        <button onClick={searchArticles}>
          Search
        </button>
      </div>

      {loading && (
        <p>Loading knowledge articles...</p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {!loading && !error && articles.length === 0 && (
        <p>No knowledge articles found.</p>
      )}

      <div className="knowledge-grid">
        {articles.map((article) => (
          <div
            className="knowledge-card"
            key={article._id}
          >
            <div className="knowledge-card-header">
              <h2>{article.title}</h2>

              <span className="category-badge">
                {article.category}
              </span>
            </div>

            <p className="knowledge-problem">
              {article.problem}
            </p>

            {article.symptoms?.length > 0 && (
              <div>
                <h3>Symptoms</h3>

                <ul>
                  {article.symptoms.map(
                    (symptom, index) => (
                      <li key={index}>
                        {symptom}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            <div>
              <h3>Solution</h3>

              <p>{article.solution}</p>
            </div>

            {article.troubleshootingSteps?.length > 0 && (
              <div>
                <h3>Troubleshooting Steps</h3>

                <ol>
                  {article.troubleshootingSteps.map(
                    (step, index) => (
                      <li key={index}>
                        {step}
                      </li>
                    )
                  )}
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default KnowledgeBase;