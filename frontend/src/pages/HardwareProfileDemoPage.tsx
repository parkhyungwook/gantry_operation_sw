import React, { useEffect, useState } from "react";
import "./HardwareProfileDemoPage.css";
import { createHardwareProfile, listHardwareProfiles } from "../services/processApi";
import { HardwareProfile } from "../types";

type MachineInput = { no: number; name: string };
type StockerInput = { no: number; name: string; type?: string };
type TurnoverInput = { no: number; name: string; mode?: string; type?: string };
type BufferInput = { no: number; name?: string; exists: boolean };
type ChuteInput = { no: number; name?: string; exists: boolean };

const HardwareProfileDemoPage: React.FC = () => {
  const [profiles, setProfiles] = useState<HardwareProfile[]>([]);
  const [glName, setGlName] = useState("DemoLine");
  const [controller, setController] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState<number | undefined>(undefined);
  const [series, setSeries] = useState("");
  const [axes, setAxes] = useState<number | undefined>(undefined);
  const [applied, setApplied] = useState(false);
  const [machines, setMachines] = useState<MachineInput[]>([{ no: 1, name: "M1" }]);
  const [stockers, setStockers] = useState<StockerInput[]>([]);
  const [turnovers, setTurnovers] = useState<TurnoverInput[]>([]);
  const [buffers, setBuffers] = useState<BufferInput[]>([{ no: 1, name: "B1", exists: true }]);
  const [chutes, setChutes] = useState<ChuteInput[]>([{ no: 1, name: "C1", exists: true }]);
  const [log, setLog] = useState("");

  const appendLog = (msg: string) => setLog((prev) => `[${new Date().toLocaleTimeString()}] ${msg}\n${prev}`);

  const loadProfiles = async () => {
    try {
      const res = await listHardwareProfiles();
      setProfiles(res);
    } catch (e: any) {
      appendLog(`Load failed: ${e.message}`);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const addItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, template: T) => {
    setter((prev) => [...prev, template]);
  };

  const updateItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number, patch: Partial<T>) => {
    setter((prev) => prev.map((item, i) => (i === idx ? { ...(item as any), ...patch } : item)));
  };

  const removeItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        glName,
        controller,
        host,
        port,
        series,
        axes,
        applied,
        machines,
        stockers,
        turnovers,
        buffers,
        chutes,
      };
      const res = await createHardwareProfile(payload);
      appendLog(`Created hardware profile #${res.id}`);
      await loadProfiles();
    } catch (e: any) {
      appendLog(`Create failed: ${e.response?.data?.message || e.message}`);
    }
  };

  return (
    <div className="page hp-demo-page">
      <h1 className="page-title">Hardware Profile Demo</h1>
      <div className="card-grid">
        <div className="card">
          <h2>Create Profile</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">GL Name</label>
                <input className="form-input" value={glName} onChange={(e) => setGlName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="form-label">Applied</label>
                <select className="form-select" value={applied ? "true" : "false"} onChange={(e) => setApplied(e.target.value === "true")}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Controller</label>
                <input className="form-input" value={controller} onChange={(e) => setController(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Host</label>
                <input className="form-input" value={host} onChange={(e) => setHost(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Port</label>
                <input className="form-input" type="number" value={port ?? ""} onChange={(e) => setPort(e.target.value ? parseInt(e.target.value, 10) : undefined)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Series</label>
                <input className="form-input" value={series} onChange={(e) => setSeries(e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Axes</label>
                <input className="form-input" type="number" value={axes ?? ""} onChange={(e) => setAxes(e.target.value ? parseInt(e.target.value, 10) : undefined)} />
              </div>
            </div>

            <Section title="Machines" items={machines} onAdd={() => addItem(setMachines, { no: machines.length + 1, name: "" })} onRemove={(idx) => removeItem(setMachines, idx)}>
              {machines.map((m, idx) => (
                <div className="form-row" key={idx}>
                  <div className="form-field small">
                    <label className="form-label">No</label>
                    <input className="form-input" type="number" value={m.no} onChange={(e) => updateItem(setMachines, idx, { no: parseInt(e.target.value, 10) })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={m.name} onChange={(e) => updateItem(setMachines, idx, { name: e.target.value })} />
                  </div>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeItem(setMachines, idx)}>
                    삭제
                  </button>
                </div>
              ))}
            </Section>

            <Section title="Stockers" items={stockers} onAdd={() => addItem(setStockers, { no: stockers.length + 1, name: "" })} onRemove={(idx) => removeItem(setStockers, idx)}>
              {stockers.map((s, idx) => (
                <div className="form-row" key={idx}>
                  <div className="form-field small">
                    <label className="form-label">No</label>
                    <input className="form-input" type="number" value={s.no} onChange={(e) => updateItem(setStockers, idx, { no: parseInt(e.target.value, 10) })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={s.name} onChange={(e) => updateItem(setStockers, idx, { name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Type</label>
                    <input className="form-input" value={s.type || ""} onChange={(e) => updateItem(setStockers, idx, { type: e.target.value })} />
                  </div>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeItem(setStockers, idx)}>
                    삭제
                  </button>
                </div>
              ))}
            </Section>

            <Section title="Turnovers" items={turnovers} onAdd={() => addItem(setTurnovers, { no: turnovers.length + 1, name: "" })} onRemove={(idx) => removeItem(setTurnovers, idx)}>
              {turnovers.map((t, idx) => (
                <div className="form-row" key={idx}>
                  <div className="form-field small">
                    <label className="form-label">No</label>
                    <input className="form-input" type="number" value={t.no} onChange={(e) => updateItem(setTurnovers, idx, { no: parseInt(e.target.value, 10) })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={t.name} onChange={(e) => updateItem(setTurnovers, idx, { name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Mode</label>
                    <input className="form-input" value={t.mode || ""} onChange={(e) => updateItem(setTurnovers, idx, { mode: e.target.value })} />
                  </div>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeItem(setTurnovers, idx)}>
                    삭제
                  </button>
                </div>
              ))}
            </Section>

            <Section
              title="Buffers"
              items={buffers}
              onAdd={() => addItem<BufferInput>(setBuffers, { no: buffers.length + 1, name: "", exists: true })}
              onRemove={(idx) => removeItem(setBuffers, idx)}
            >
              {buffers.map((b, idx) => (
                <div className="form-row" key={idx}>
                  <div className="form-field small">
                    <label className="form-label">No</label>
                    <input className="form-input" type="number" value={b.no} onChange={(e) => updateItem(setBuffers, idx, { no: parseInt(e.target.value, 10) })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={b.name || ""} onChange={(e) => updateItem(setBuffers, idx, { name: e.target.value })} />
                  </div>
                  <div className="form-field small">
                    <label className="form-label">Exists</label>
                    <select className="form-select" value={b.exists ? "true" : "false"} onChange={(e) => updateItem(setBuffers, idx, { exists: e.target.value === "true" })}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeItem(setBuffers, idx)}>
                    삭제
                  </button>
                </div>
              ))}
            </Section>

            <Section
              title="Chutes"
              items={chutes}
              onAdd={() => addItem<ChuteInput>(setChutes, { no: chutes.length + 1, name: "", exists: true })}
              onRemove={(idx) => removeItem(setChutes, idx)}
            >
              {chutes.map((c, idx) => (
                <div className="form-row" key={idx}>
                  <div className="form-field small">
                    <label className="form-label">No</label>
                    <input className="form-input" type="number" value={c.no} onChange={(e) => updateItem(setChutes, idx, { no: parseInt(e.target.value, 10) })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={c.name || ""} onChange={(e) => updateItem(setChutes, idx, { name: e.target.value })} />
                  </div>
                  <div className="form-field small">
                    <label className="form-label">Exists</label>
                    <select className="form-select" value={c.exists ? "true" : "false"} onChange={(e) => updateItem(setChutes, idx, { exists: e.target.value === "true" })}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeItem(setChutes, idx)}>
                    삭제
                  </button>
                </div>
              ))}
            </Section>

            <button type="submit" className="btn btn-primary">
              Create Profile
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Existing Profiles</h2>
          {profiles.length === 0 ? (
            <div className="empty-state">No profiles</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>GL</th>
                  <th>Applied</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.glName}</td>
                    <td>{p.applied ? "YES" : "NO"}</td>
                    <td>{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Log</h2>
            <button className="btn btn-neutral" onClick={() => setLog("")}>
              Clear
            </button>
          </div>
          <pre className="log-box">{log || "Logs will appear here..."}</pre>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{
  title: string;
  items: any[];
  onAdd: () => void;
  onRemove: (idx: number) => void;
  children: React.ReactNode;
}> = ({ title, onAdd, children }) => (
  <div className="sub-section">
    <div className="sub-header">
      <h3>{title}</h3>
      <button type="button" className="btn btn-neutral btn-small" onClick={onAdd}>
        +
      </button>
    </div>
    {children}
  </div>
);

export default HardwareProfileDemoPage;
