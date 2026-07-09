import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, AiFinding } from "../lib/api.js";
import { buildFileTree, FileTreeNode } from "../lib/fileTree.js";

interface FileEntry {
  path: string;
  language: string | null;
}

export function Review() {
  const { id } = useParams<{ id: string }>();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [findings, setFindings] = useState<AiFinding[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/repo/${id}/tree`).then((res) => {
      setFiles(res.data.files.filter((f: any) => f.language));
    });
  }, [id]);

  async function reviewFile(filePath: string) {
    setSelectedFile(filePath);
    setStreaming(true);
    setStreamText("");
    setFindings([]);
    setError(null);

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/repo/${id}/ai-review/file/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filePath }),
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const lines = evt.split("\n");
          const eventType = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
          const dataLine = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
          if (!dataLine) continue;
          const data = JSON.parse(dataLine);

          if (eventType === "token") {
            setStreamText((prev) => prev + data.token);
          } else if (eventType === "done") {
            setFindings(data.findings);
          } else if (eventType === "error") {
            setError(data.error);
          }
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Review failed");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div>
      <Link to={`/repository/${id}`} style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        ← Back to repository
      </Link>
      <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 1.5rem" }}>AI Review</h1>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem" }}>
        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          {buildFileTree(files).children.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              onFileClick={reviewFile}
              selectedPath={selectedFile}
              disabled={streaming}
            />
          ))}
        </div>

        <div>
          {!selectedFile && <p style={{ color: "var(--text-muted)" }}>Select a file to review.</p>}

          {selectedFile && (
            <>
              <h3 className="mono" style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                {selectedFile}
              </h3>

              {streaming && (
                <div
                  className="mono"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "1rem",
                    fontSize: "0.78rem",
                    whiteSpace: "pre-wrap",
                    maxHeight: 300,
                    overflowY: "auto",
                    color: "var(--text-muted)",
                  }}
                >
                  {streamText || "Waiting for model..."}
                </div>
              )}

              {error && <p style={{ color: "var(--critical)", marginTop: "1rem" }}>{error}</p>}

              {!streaming && findings.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "1rem" }}>
                  {findings.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "0.8rem 1rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                        <strong style={{ fontSize: "0.9rem" }}>{f.issue}</strong>
                        <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {f.category} · {f.confidence}%{f.lineNumber ? ` · line ${f.lineNumber}` : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", marginBottom: "0.3rem" }}>{f.suggestion}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{f.explanation}</div>
                    </div>
                  ))}
                </div>
              )}

              {!streaming && !error && findings.length === 0 && streamText && (
                <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>No issues found.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}