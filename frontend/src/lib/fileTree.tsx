import { useState } from "react";
import { Folder, FolderOpen, File as FileIcon, ChevronRight as ChevronRightIcon, ChevronDown } from "lucide-react";

export interface FileEntry {
  path: string;
  language?: string | null;
}

export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  language?: string | null;
  children: TreeNode[];
}

export function buildFileTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      let existing = current.children.find((c) => c.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isLast,
          language: isLast ? file.language : undefined,
          children: [],
        };
        current.children.push(existing);
      }
      current = existing;
    });
  }
  function sortNode(node: TreeNode) {
    node.children.sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1
    );
    node.children.forEach(sortNode);
  }
  sortNode(root);
  return root;
}

interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
  onFileClick?: (path: string) => void;
  selectedPath?: string | null;
  disabled?: boolean;
}

export function FileTreeNode({ node, depth, onFileClick, selectedPath, disabled }: FileTreeNodeProps) {
  const [open, setOpen] = useState(depth < 1);

  if (!node.isDir) {
    const isSelected = selectedPath === node.path;
    const Wrapper = onFileClick ? "button" : "div";
    return (
      <Wrapper
        onClick={onFileClick ? () => onFileClick(node.path) : undefined}
        disabled={onFileClick ? disabled : undefined}
        className="mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.3rem 0.4rem",
          paddingLeft: `${depth * 1.1 + 0.4}rem`,
          fontSize: "0.78rem",
          color: "var(--text)",
          borderRadius: 4,
          width: "100%",
          textAlign: "left",
          background: isSelected ? "var(--surface-raised)" : "transparent",
          border: onFileClick ? "1px solid transparent" : undefined,
          cursor: onFileClick ? (disabled ? "not-allowed" : "pointer") : undefined,
        }}
      >
        <FileIcon size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        {node.language && (
          <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.7rem" }}>
            {node.language}
          </span>
        )}
      </Wrapper>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          padding: "0.3rem 0.4rem",
          paddingLeft: `${depth * 1.1}rem`,
          fontSize: "0.78rem",
          color: "var(--text)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          fontWeight: 600,
          borderRadius: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRightIcon size={13} />}
        {open ? <FolderOpen size={14} color="var(--accent)" /> : <Folder size={14} color="var(--accent)" />}
        {node.name || "root"}
        <span style={{ marginLeft: "0.3rem", color: "var(--text-muted)", fontWeight: 400, fontSize: "0.7rem" }}>
          ({node.children.length})
        </span>
      </button>
      {open &&
        node.children.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            onFileClick={onFileClick}
            selectedPath={selectedPath}
            disabled={disabled}
          />
        ))}
    </div>
  );
}