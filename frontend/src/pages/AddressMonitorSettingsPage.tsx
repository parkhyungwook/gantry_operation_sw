import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddressMonitorPage.css";

type DisplayFormat = "binary" | "decimal" | "hex" | "blank";
type DataType =
  | "WordUnsigned"
  | "BitString16"
  | "DoubleWordUnsigned"
  | "BitString32"
  | "WordSigned"
  | "DoubleWordSigned"
  | "FloatSingle"
  | "FloatDouble"
  | "String"
  | "StringUnicode"
  | "Time";

type AddressGroup = {
  id: string;
  name: string;
  start: number;
  length: number;
  format: DisplayFormat;
  dataType: DataType;
  visible: boolean;
};

const GROUP_STORAGE_KEY = "addressMonitorGroups";

const AddressMonitorSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<AddressGroup[]>([]);
  const [form, setForm] = useState<Partial<AddressGroup>>({
    name: "",
    start: 0,
    length: 16,
    format: "binary",
    dataType: "BitString16",
    visible: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem(GROUP_STORAGE_KEY);
    if (saved) {
      try {
        setGroups(JSON.parse(saved) as AddressGroup[]);
      } catch {
        setGroups([]);
      }
    }
  }, []);

  const saveGroups = (next: AddressGroup[]) => {
    setGroups(next);
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(next));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const newGroup: AddressGroup = {
      id: crypto.randomUUID(),
      name: form.name ?? "",
      start: form.start ?? 0,
      length: form.length ?? 1,
      format: (form.format as DisplayFormat) ?? "binary",
      dataType: (form.dataType as DataType) ?? "BitString16",
      visible: form.visible ?? true,
    };
    const next = [...groups, newGroup];
    saveGroups(next);
    setForm({ name: "", start: 0, length: 16, format: "binary", dataType: "BitString16", visible: true });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this group?")) return;
    saveGroups(groups.filter((g) => g.id !== id));
  };

  const handleToggle = (id: string) => {
    const next = groups.map((g) => (g.id === id ? { ...g, visible: !g.visible } : g));
    saveGroups(next);
  };

  return (
    <div className="address-page">
      <div className="address-header">
        <div>
          <h1>Address Monitor Settings</h1>
          <p className="address-sub">그룹 정의 및 표시 형식 설정</p>
        </div>
        <div className="address-meta">
          <button className="comment-btn secondary" onClick={() => navigate("/address-monitor")}>
            Back to Monitor
          </button>
        </div>
      </div>

      <div className="card">
        <h2>그룹 추가</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Group Name</label>
              <input
                className="form-input"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: Cylinder Status"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Start Address (D)</label>
              <input
                type="number"
                className="form-input"
                value={form.start ?? 0}
                onChange={(e) => setForm({ ...form, start: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Length (words)</label>
              <input
                type="number"
                className="form-input"
                value={form.length ?? 1}
                onChange={(e) => setForm({ ...form, length: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Display Format</label>
              <select
                className="form-select"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value as DisplayFormat })}
              >
                <option value="binary">Binary</option>
                <option value="decimal">Decimal</option>
                <option value="hex">Hex</option>
                <option value="blank">Blank</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Data Type</label>
              <select
                className="form-select"
                value={form.dataType}
                onChange={(e) => setForm({ ...form, dataType: e.target.value as DataType })}
              >
                <option value="BitString16">Bit String [16-bit]</option>
                <option value="BitString32">Bit String [32-bit]</option>
                <option value="WordUnsigned">Word [Unsigned]</option>
                <option value="DoubleWordUnsigned">Double Word [Unsigned]</option>
                <option value="WordSigned">Word [Signed]</option>
                <option value="DoubleWordSigned">Double Word [Signed]</option>
                <option value="FloatSingle">FLOAT [Single Precision]</option>
                <option value="FloatDouble">FLOAT [Double Precision]</option>
                <option value="String">String</option>
                <option value="StringUnicode">String [Unicode]</option>
                <option value="Time">Time</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Visible</label>
              <select
                className="form-select"
                value={form.visible ? "true" : "false"}
                onChange={(e) => setForm({ ...form, visible: e.target.value === "true" })}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="form-row" style={{ gap: 8 }}>
            <button type="submit" className="comment-btn primary">
              Add Group
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>그룹 목록 ({groups.length})</h2>
        {groups.length === 0 ? (
          <div className="empty-state">No groups defined.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Range</th>
                <th>Format</th>
                <th>Type</th>
                <th>Visible</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td className="key-cell">{g.name}</td>
                  <td>{`D${g.start} ~ D${g.start + g.length - 1}`}</td>
                  <td>{g.format}</td>
                  <td>{g.dataType}</td>
                  <td>{g.visible ? "Yes" : "No"}</td>
                  <td className="actions-cell">
                    <button className="comment-btn secondary btn-small" onClick={() => handleToggle(g.id)}>
                      {g.visible ? "Hide" : "Show"}
                    </button>
                    <button className="comment-btn danger btn-small" onClick={() => handleDelete(g.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AddressMonitorSettingsPage;
