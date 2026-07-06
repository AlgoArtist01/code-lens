import { useAuth } from "../lib/AuthContext.js";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { Mail, Calendar, FolderGit2, LucideIcon } from "lucide-react";

export function Profile() {
  const { user } = useAuth();
  const [repoCount, setRepoCount] = useState<number | null>(null);

  useEffect(() => {
    api.get("/repos").then((res) => setRepoCount(res.data.length));
  }, []);

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Profile</h1>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {initial}
        </div>
        <div>
          <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>{user?.email}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Member</div>
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "1.25rem",
        }}
      >
        <ProfileRow icon={Mail} label="Email" value={user?.email ?? "—"} />
        <ProfileRow icon={FolderGit2} label="Repositories" value={repoCount === null ? "..." : String(repoCount)} />
        <ProfileRow icon={Calendar} label="Account ID" value={user?.id ?? "—"} mono />
      </div>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Icon size={16} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</div>
        <div className={mono ? "mono" : ""} style={{ fontSize: "0.88rem" }}>
          {value}
        </div>
      </div>
    </div>
  );
}