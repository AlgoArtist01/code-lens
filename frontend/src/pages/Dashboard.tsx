import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, Repository, getErrorMessage } from "../lib/api.js";
import { GitBranch, Upload, Trash2, ChevronRight } from "lucide-react";

export function Dashboard() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gitUrl, setGitUrl] = useState("");
  const [cloning, setCloning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadRepos() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/repos");
      setRepos(res.data);
    } catch {
      setError("Failed to load repositories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepos();
  }, []);

  async function handleClone(e: FormEvent) {
    e.preventDefault();
    setActionError(null);
    setCloning(true);
    try {
      await api.post("/repo/git", { url: gitUrl });
      setGitUrl("");
      await loadRepos();
    } catch (err) {
      setActionError(getErrorMessage(err, "Clone failed"));
    } finally {
      setCloning(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.zip$/i, ""));
      await api.post("/repo/upload", formData);
      await loadRepos();
    } catch (err) {
      setActionError(getErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(e: React.MouseEvent, repoId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this repository? This cannot be undone.")) return;
    try {
      await api.delete(`/repo/${repoId}`);
      await loadRepos();
    } catch {
      setActionError("Failed to delete repository");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.7rem", margin: "0 0 0.3rem" }}>My Repositories</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
          {repos.length} repositor{repos.length === 1 ? "y" : "ies"} under review
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <form
          onSubmit={handleClone}
          className="card"
          style={{
            display: "flex",
            gap: "0.6rem",
            padding: "0.85rem",
            flex: "1 1 340px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
            <GitBranch size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: "0.3rem" }} />
            <input
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              required
              style={{
                flex: 1,
                background: "var(--surface-hover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "0.55rem 0.7rem",
                color: "var(--text)",
                fontSize: "0.85rem",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={cloning}
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "#0B0E14",
              padding: "0.55rem 1.15rem",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 12px var(--accent-glow)",
            }}
          >
            {cloning ? "Cloning..." : "Clone Git Repo"}
          </button>
        </form>

        <label
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.55rem",
            padding: "0.85rem 1.5rem",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload ZIP"}
          <input type="file" accept=".zip" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>

      {actionError && (
        <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--critical)" }}>{actionError}</div>
      )}
      {error && <p style={{ color: "var(--critical)" }}>{error}</p>}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 76, borderRadius: "var(--radius)" }} />
          ))}
        </div>
      )}

      {!loading && !error && repos.length === 0 && (
        <div
          className="card"
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            color: "var(--text-muted)",
            borderStyle: "dashed",
          }}
        >
          <div style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>No repositories yet</div>
          <div style={{ fontSize: "0.82rem" }}>Upload a ZIP or clone from Git to get started</div>
        </div>
      )}

      {!loading && repos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {repos.map((repo, idx) => (
            <Link
              key={repo.id}
              to={`/repository/${repo.id}`}
              className="card fade-in"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.15rem 1.4rem",
                textDecoration: "none",
                color: "var(--text)",
                animationDelay: `${idx * 40}ms`,
                animationFillMode: "backwards",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(3px)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface-hover)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  <GitBranch size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.98rem" }}>{repo.name}</div>
                  <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {repo.source_type} · {new Date(repo.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <StatusBadge status={repo.status} />
                <button
                  onClick={(e) => handleDelete(e, repo.id)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-muted)",
                    padding: "0.4rem 0.6rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--critical)";
                    e.currentTarget.style.color = "var(--critical)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    completed: "var(--low)",
    pending: "var(--high)",
    failed: "var(--critical)",
  };
  const color = colorMap[status] ?? "var(--text-muted)";
  return (
    <span
      style={{
        fontSize: "0.72rem",
        fontWeight: 600,
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: 999,
        padding: "0.25rem 0.7rem",
      }}
    >
      {status}
    </span>
  );
}