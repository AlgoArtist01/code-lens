import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, Repository } from "../lib/api.js";

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
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? "Clone failed");
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
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(e: React.MouseEvent, repoId: string) {
    e.preventDefault(); // stop the Link navigation
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
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>My Repositories</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <form
          onSubmit={handleClone}
          style={{
            display: "flex",
            gap: "0.5rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem",
            flex: "1 1 320px",
          }}
        >
          <input
            type="text"
            placeholder="https://github.com/user/repo.git"
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            required
            style={{
              flex: 1,
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "0.5rem 0.6rem",
              color: "var(--text)",
              fontSize: "0.85rem",
            }}
          />
          <button
            type="submit"
            disabled={cloning}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
            }}
          >
            {cloning ? "Cloning..." : "Clone Git Repo"}
          </button>
        </form>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem 1.25rem",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {uploading ? "Uploading..." : "Upload ZIP"}
          <input type="file" accept=".zip" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>

      {actionError && <p style={{ color: "var(--critical)", marginBottom: "1rem" }}>{actionError}</p>}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 8 }} />
          ))}
        </div>
      )}
      {error && <p style={{ color: "var(--critical)" }}>{error}</p>}

      {!loading && !error && repos.length === 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: 10,
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          No repositories yet. Upload a ZIP or clone from Git to get started.
        </div>
      )}

      {!loading && repos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {repos.map((repo) => (
            <Link
              key={repo.id}
              to={`/repository/${repo.id}`}
              className="fade-in"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "1rem 1.25rem",
                textDecoration: "none",
                color: "var(--text)",
                transition: "border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{repo.name}</div>
                <div className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  {repo.source_type} · {new Date(repo.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <StatusBadge status={repo.status} />
                <button
                  onClick={(e) => handleDelete(e, repo.id)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    color: "var(--critical)",
                    padding: "0.3rem 0.6rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                >
                  Delete
                </button>
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
        fontSize: "0.75rem",
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: "0.2rem 0.6rem",
      }}
    >
      {status}
    </span>
  );
}