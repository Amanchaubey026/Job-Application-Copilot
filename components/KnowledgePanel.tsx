import { useMemo, useState } from "react";
import type { CareerKnowledgeItem, KnowledgeType } from "~types/knowledge";
import { TextField } from "./TextField";

type Props = {
  items: CareerKnowledgeItem[];
  query: string;
  onQuery: (value: string) => void;
  indexLabel: string;
  indexing: boolean;
  onRebuild: () => void;
  onSave: (item: CareerKnowledgeItem) => void;
  onDelete: (id: string) => void;
  onAdd: (type: KnowledgeType) => void;
};

const TYPES: KnowledgeType[] = [
  "experience",
  "project",
  "skill",
  "achievement",
  "education",
  "certification",
  "responsibility",
  "technology",
  "metric",
  "other"
];

export function KnowledgePanel({
  items,
  query,
  onQuery,
  indexLabel,
  indexing,
  onRebuild,
  onSave,
  onDelete,
  onAdd
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.content, item.metadata.company, ...(item.metadata.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  const grouped = TYPES.map((type) => ({
    type,
    rows: filtered.filter((item) => item.type === type)
  })).filter((group) => group.rows.length);

  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">Career Knowledge</h2>
        <div className="status-bar">{indexLabel}</div>
        <TextField
          label="Search your experience"
          value={query}
          onChange={onQuery}
          placeholder="AI chatbot, React, Fluid AI..."
        />
        <div className="btn-row">
          <button className="btn btn-secondary" type="button" disabled={indexing} onClick={onRebuild}>
            {indexing ? "Updating…" : "Rebuild Index"}
          </button>
        </div>
      </div>
      <div className="btn-row">
        {(["experience", "project", "achievement", "skill", "certification"] as KnowledgeType[]).map(
          (type) => (
            <button key={type} className="btn btn-ghost" type="button" onClick={() => onAdd(type)}>
              + Add {type}
            </button>
          )
        )}
      </div>
      {grouped.length === 0 ? (
        <div className="empty">No knowledge items yet. Save a profile to extract evidence.</div>
      ) : (
        grouped.map((group) => (
          <div className="card" key={group.type}>
            <h2 className="section-title">{group.type}</h2>
            {group.rows.map((item) => (
              <div className="item-card" key={item.id}>
                <h3>{item.title}</h3>
                <div className="muted">
                  {[item.metadata.company, item.metadata.role].filter(Boolean).join(" · ")}
                </div>
                {editingId === item.id ? (
                  <div style={{ marginTop: 8 }}>
                    <TextField
                      label="Title"
                      value={item.title}
                      onChange={(title) => onSave({ ...item, title })}
                    />
                    <TextField
                      label="Content"
                      multiline
                      value={item.content}
                      onChange={(content) => onSave({ ...item, content })}
                    />
                    <button className="btn btn-secondary" type="button" onClick={() => setEditingId(null)}>
                      Close
                    </button>
                  </div>
                ) : (
                  <p className="muted">{item.content.slice(0, 220)}</p>
                )}
                <div className="btn-row">
                  <button className="btn btn-ghost" type="button" onClick={() => setEditingId(item.id)}>
                    Edit
                  </button>
                  {item.origin === "manual" ? (
                    <button className="btn btn-ghost" type="button" onClick={() => onDelete(item.id)}>
                      Delete
                    </button>
                  ) : (
                    <span className="tiny">From profile</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
