import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ChatMessage, getErrorMessage } from "../lib/api.js";
import { Send, RefreshCw, FileCode } from "lucide-react";

const SAMPLE_QUESTIONS = [
    "Where is authentication handled?",
    "Explain the middleware.",
    "Where are the API routes?",
    "How is JWT validated?",
    "Which file handles uploads?",
];

export function Chat() {
    const { id } = useParams<{ id: string }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [indexing, setIndexing] = useState(false);
    const [indexed, setIndexed] = useState(false);
    const [indexInfo, setIndexInfo] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        api.get(`/repo/${id}/rag/status`).then((res) => {
            if (res.data.indexed) {
                setIndexed(true);
                setIndexInfo(`Already indexed: ${res.data.fileCount} files, ${res.data.chunkCount} chunks`);
            }
        });
    }, [id]);

    async function runIndex() {
        setIndexing(true);
        setIndexInfo(null);
        try {
            const res = await api.post(`/repo/${id}/rag/index`);
            setIndexed(true);
            setIndexInfo(`Indexed ${res.data.filesIndexed} files, ${res.data.chunksCreated} chunks`);
        } catch (err) {
            setIndexInfo(getErrorMessage(err, "Indexing failed"));
        } finally {
            setIndexing(false);
        }
    }

    async function sendMessage(question: string) {
        if (!question.trim() || loading) return;
        setMessages((prev) => [...prev, { role: "user", content: question }]);
        setInput("");
        setLoading(true);
        try {
            const res = await api.post(`/repo/${id}/rag/chat`, { question });
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: res.data.answer, sources: res.data.sources },
            ]);
        } catch (err) {
            const errMsg = getErrorMessage(err, "Something went wrong");
            setMessages((prev) => [...prev, { role: "assistant", content: `⚠ ${errMsg}` }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 5rem)" }}>
            <Link to={`/repository/${id}`} style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                ← Back to repository
            </Link>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0.5rem 0 1rem" }}>
                <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Repository Assistant</h1>
                <button
                    onClick={runIndex}
                    disabled={indexing}
                    className="card"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 0.9rem",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                    }}
                >
                    <RefreshCw size={14} className={indexing ? "spin" : ""} />
                    {indexing ? "Indexing..." : indexed ? "Re-index" : "Index repository"}
                </button>
            </div>

            {indexInfo && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{indexInfo}</div>
            )}

            <div
                className="card"
                style={{
                    flex: 1,
                    padding: "1.25rem",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    marginBottom: "1rem",
                }}
            >
                {messages.length === 0 && (
                    <div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                            Index the repository first, then ask a question. Try one of these:
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {SAMPLE_QUESTIONS.map((q) => (
                                <button
                                    key={q}
                                    onClick={() => sendMessage(q)}
                                    style={{
                                        textAlign: "left",
                                        background: "var(--surface-hover)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "var(--radius-sm)",
                                        color: "var(--text)",
                                        padding: "0.6rem 0.9rem",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className="fade-in"
                        style={{
                            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                            maxWidth: "80%",
                        }}
                    >
                        <div
                            style={{
                                background: msg.role === "user" ? "var(--accent)" : "var(--surface-hover)",
                                color: msg.role === "user" ? "#0B0E14" : "var(--text)",
                                borderRadius: "var(--radius-sm)",
                                padding: "0.7rem 0.9rem",
                                fontSize: "0.88rem",
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {msg.content}
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                            <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                {msg.sources.map((s, i) => (
                                    <div
                                        key={i}
                                        className="mono"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.4rem",
                                            fontSize: "0.72rem",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        <FileCode size={12} />
                                        {s.filePath}:{s.startLine}-{s.endLine}
                                        <span style={{ opacity: 0.6 }}>({(s.score * 100).toFixed(0)}%)</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div style={{ alignSelf: "flex-start", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Thinking...
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(input);
                }}
                style={{ display: "flex", gap: "0.6rem" }}
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about this repository..."
                    disabled={loading}
                    style={{
                        flex: 1,
                        background: "var(--surface-hover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.7rem 0.9rem",
                        color: "var(--text)",
                        fontSize: "0.88rem",
                    }}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    style={{
                        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        color: "#0B0E14",
                        padding: "0.7rem 1.1rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}