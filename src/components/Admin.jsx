import React, { useState } from "react";
import axios from "axios";
import "./Admin.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Map ya plain object dono handle karo
function normalizeTopicCounts(topic_counts) {
  if (!topic_counts) return {};
  if (topic_counts instanceof Map) return Object.fromEntries(topic_counts);
  if (typeof topic_counts === "object" && !Array.isArray(topic_counts)) return topic_counts;
  return {};
}

// topic_counts ko readable string banao — highest count pehle
function formatTopicCounts(topic_counts) {
  const counts = normalizeTopicCounts(topic_counts);
  const entries = Object.entries(counts).filter(([, v]) => Number(v) > 0);
  if (!entries.length) return "—";
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([key, val]) => `${key}: ${val}`)
    .join(", ");
}

// Sabhi leads se unique topic keys nikalo (CSV columns ke liye)
function getAllTopicKeys(leads) {
  const keys = new Set();
  for (const lead of leads) {
    const counts = normalizeTopicCounts(lead.topic_counts);
    Object.keys(counts).forEach((k) => keys.add(k));
  }
  return [...keys].sort();
}

// Array ya string dono display ke liye
function renderArrayField(value) {
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean);
    if (!filtered.length) return "—";
    return filtered.map((v, i) => <div key={i}>{v}</div>);
  }
  return value || "—";
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (emailInput === "admin@gmail.com" && password === "Growmore1") {
      setIsLoggedIn(true);
      setError("");
      fetchLeads();
    } else {
      setError("Invalid admin credentials");
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/leads/all`);
      if (data.success) {
        // Frontend pe bhi normalize karo — backend se jo bhi shape aaye
        const normalized = (data.leads || []).map((lead) => ({
          ...lead,
          topic_counts: normalizeTopicCounts(lead.topic_counts),
          phone: Array.isArray(lead.phone)
            ? lead.phone.filter(Boolean)
            : lead.phone ? [lead.phone] : [],
          email: Array.isArray(lead.email)
            ? lead.email.filter(Boolean)
            : lead.email ? [lead.email] : [],
        }));
        console.log("✅ First lead topic_counts:", JSON.stringify(normalized[0]?.topic_counts));
        setLeads(normalized);
      } else {
        setLeads([]);
      }
    } catch (err) {
      console.error("Failed to fetch leads", err);
      if (err.response?.status === 404) setLeads([]);
      else setError("Failed to fetch leads. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!leads.length) return;

    const topicKeys = getAllTopicKeys(leads);

    const headers = [
      "Date", "Name", "Company", "Designation",
      "Email(s)", "Phone(s)",
      ...topicKeys,
    ];

    const escapeCSV = (v) => `"${String(v || "").replace(/"/g, '""')}"`;

    const rows = leads.map((lead) => {
      const phones = Array.isArray(lead.phone) ? lead.phone.join("; ") : (lead.phone || "");
      const emails = Array.isArray(lead.email) ? lead.email.join("; ") : (lead.email || "");
      const counts = normalizeTopicCounts(lead.topic_counts);

      const dateStr = lead.createdAt
        ? (() => {
          const d = new Date(lead.createdAt);
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;   // 30/06/2026
        })()
        : "";

      return [
        escapeCSV(dateStr),        // 👈 ab escape bhi ho raha hai
        escapeCSV(lead.name),
        escapeCSV(lead.company),
        escapeCSV(lead.designation),
        escapeCSV(emails),
        escapeCSV(phones),
        ...topicKeys.map((key) => counts[key] || 0),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);   // global URL — BACKEND_URL se conflict nahi
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", `leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);   // memory free karo
  };

  // ── Login Screen ──────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="admin-login-wrapper">
        <div className="admin-login-glass">
          <div className="admin-login-header">
            <img src="/IOTFIY.jpeg" alt="Logo" className="admin-logo" />
            <h2>Admin Portal</h2>
            <p>Access dashboard and leads</p>
          </div>
          <form onSubmit={handleLogin} className="admin-login-form">
            <div className="input-group">
              <label>Email ID</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <div className="admin-error">{error}</div>}
            <button type="submit" className="admin-btn-primary">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────
  return (
    <div className="admin-dashboard-wrapper">
      <nav className="admin-navbar">
        <div className="navbar-brand">
          <img src="/IOTFIY.jpeg" alt="Logo" className="navbar-logo" />
          <span>IoTFIY Admin</span>
        </div>
        <button className="admin-btn-outline" onClick={() => setIsLoggedIn(false)}>
          Logout
        </button>
      </nav>

      <main className="admin-main">
        <header className="dashboard-header">
          <div>
            <h1>Leads Dashboard</h1>
            <p>View all captured leads from conversational sessions</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              className="admin-btn-outline"
              onClick={handleDownloadCSV}
              disabled={!leads.length}
            >
              ⬇ Download CSV
            </button>
            <button
              className="admin-btn-primary"
              onClick={fetchLeads}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "↻ Refresh Data"}
            </button>
          </div>
        </header>

        {/* Stats row */}
        {leads.length > 0 && (
          <div className="admin-stats-row">
            <div className="admin-stat-card">
              <span className="admin-stat-value">{leads.length}</span>
              <span className="admin-stat-label">Total Leads</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">
                {leads.filter((l) => Array.isArray(l.email) ? l.email.length : l.email).length}
              </span>
              <span className="admin-stat-label">With Email</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-value">
                {getAllTopicKeys(leads).length}
              </span>
              <span className="admin-stat-label">Unique Topics</span>
            </div>
          </div>
        )}

        <div className="table-container glass">
          {loading && !leads.length ? (
            <div className="admin-loading">Loading leads...</div>
          ) : !leads.length ? (
            <div className="admin-empty">No leads found.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Designation</th>
                  <th>Email(s)</th>
                  <th>Phone(s)</th>
                  <th>Topics Asked</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const topicText = formatTopicCounts(lead.topic_counts);
                  const counts = normalizeTopicCounts(lead.topic_counts);
                  const topicEntries = Object.entries(counts)
                    .filter(([, v]) => Number(v) > 0)
                    .sort((a, b) => b[1] - a[1]);

                  return (
                    <tr key={lead._id}>
                      <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td className="font-medium text-white">{lead.name || "—"}</td>
                      <td>{lead.company || "—"}</td>
                      <td>{lead.designation || "—"}</td>
                      <td className="td-multiline">{renderArrayField(lead.email)}</td>
                      <td className="td-multiline">{renderArrayField(lead.phone)}</td>
                      <td className="td-topics">
                        {topicEntries.length ? (
                          <div className="topic-pills">
                            {topicEntries.map(([key, val]) => (
                              <span key={key} className="topic-pill">
                                <span className="topic-pill__name">{key}</span>
                                <span className="topic-pill__count">{val}</span>
                              </span>
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}