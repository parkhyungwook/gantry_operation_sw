import React, { useState } from "react";
import CustomModal from "../components/CustomModal";
import "./HardwareDefinitionAddPage.css";



type GantryConfig = {
  nickname: string;
  description: string;
  controller: "Fanuc" | "Mitsubishi" | "";
  host: string;
  port: string;
  series: string;
  axes: number;
  gripperCount: number;
  gripperType: "Tilting" | "Rotate" | "X" | "";
  
};
type MachineUnit = {
  id: number;
  nickname: string;
  controller: "Fanuc" | "";
  host: string;
  port: string;
};

type StockerUnit = {
  id: number;
  nickname: string;
  type: "In" | "Out" | "In/Out" | "";
};

type TurnoverUnit = {
  id: number;
  nickname: string;
  mode: "A" | "B" | "C" | "";
};

type BufferUnit = {
  id: number;
  nickname: string;
};

type ChuteUnit = {
  id: number;
  nickname: string;
};

/* ================================================== */

const HardwareDefinitionPage: React.FC = () => {
  const [mode, setMode] = useState<"edit" | "summary" | "save">("edit");

  // Popup states
  const [savePopup, setSavePopup] = useState(false);

  /* ===================== GANTRY ===================== */
  const [gantry, setGantry] = useState<GantryConfig>({
    nickname: "",
    description: "",
    controller: "",
    host: "",
    port: "",
    series: "",
    axes: 2,
    gripperCount: 0,
    gripperType: "",
  });

  /* ===================== COUNTS ===================== */
  const [machineCount, setMachineCount] = useState(0);
  const [stockerCount, setStockerCount] = useState(0);
  const [turnoverCount, setTurnoverCount] = useState(0);
  const [bufferCount, setBufferCount] = useState(0);
  const [chuteCount, setChuteCount] = useState(0);

  /* ===================== ARRAYS ===================== */
  const [machines, setMachines] = useState<MachineUnit[]>([]);
  const [stockers, setStockers] = useState<StockerUnit[]>([]);
  const [turnovers, setTurnovers] = useState<TurnoverUnit[]>([]);
  const [buffers, setBuffers] = useState<BufferUnit[]>([]);
  const [chutes, setChutes] = useState<ChuteUnit[]>([]);

  /* ===================== UPDATE COUNTS ===================== */
  const updateMachineCount = (count: number) => {
    setMachineCount(count);
    setMachines(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        nickname: `Machine ${i + 1}`,
        controller: "",
        host: "",
        port: "",
      }))
    );
  };

  const updateStockerCount = (count: number) => {
    setStockerCount(count);
    setStockers(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        nickname: `Stocker ${i + 1}`,
        type: "",
      }))
    );
  };

  const updateTurnoverCount = (count: number) => {
    setTurnoverCount(count);
    setTurnovers(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        nickname: `Turnover ${i + 1}`,
        mode: "",
      }))
    );
  };

  const updateBufferCount = (count: number) => {
    setBufferCount(count);
    setBuffers(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        nickname: `Buffer ${i + 1}`,
      }))
    );
  };

  const updateChuteCount = (count: number) => {
    setChuteCount(count);
    setChutes(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        nickname: `Chute ${i + 1}`,
      }))
    );
  };

  /* ===================== FILTERS ===================== */
  const filterIP = (v: string) => v.replace(/[^0-9.]/g, "");
  const filterPort = (v: string) => v.replace(/[^0-9]/g, "");

  /* ===================== MAIN RETURN ===================== */
  return (
    <div className="hardware-page">

      {/* ===================== SUMMARY ===================== */}
      {mode === "summary" && (
        <div className="summary-view">
          <div className="summary-header">
            <h2>Hardware Configuration Summary</h2>

            <div className="summary-btn-area">
              <button className="edit-btn" onClick={() => setMode("edit")}>Edit</button>
              <button className="save-btn" onClick={() => setSavePopup(true)}>Save</button>
            </div>
          </div>

          <div className="summary-sections">

            <div className="summary-card">
              <h3>Gantry Loader</h3>
              <p>Name: {gantry.nickname || "-"}</p>
              <p>Description: {gantry.description || "-"}</p>
              <p>Controller: {gantry.controller || "-"}</p>
              <p>Host: {gantry.host || "-"}</p>
              <p>Port: {gantry.port || "-"}</p>
              <p>Series: {gantry.series || "-"}</p>
              <p>Axes: {gantry.axes}</p>
              <p>Grippers: {gantry.gripperCount}</p>
              <p>Gripper Type: {gantry.gripperType || "-"}</p>
            </div>

            <div className="summary-card">
              <h3>Machines</h3>
              {machines.length === 0 && <p>- None -</p>}
              {machines.map((m) => (
                <p key={m.id}>
                  {m.nickname}: {m.controller || "-"} / {m.host}:{m.port}
                </p>
              ))}
            </div>

            <div className="summary-card">
              <h3>Stockers</h3>
              {stockers.length === 0 && <p>- None -</p>}
              {stockers.map((s) => (
                <p key={s.id}>{s.nickname}: {s.type || "-"}</p>
              ))}
            </div>

            <div className="summary-card">
              <h3>Turnovers</h3>
              {turnovers.length === 0 && <p>- None -</p>}
              {turnovers.map((t) => (
                <p key={t.id}>{t.nickname}: {t.mode || "-"}</p>
              ))}
            </div>

            <div className="summary-card">
              <h3>Buffers</h3>
              {buffers.length === 0 && <p>- None -</p>}
              {buffers.map((b) => (
                <p key={b.id}>{b.nickname}</p>
              ))}
            </div>

            <div className="summary-card">
              <h3>Chutes</h3>
              {chutes.length === 0 && <p>- None -</p>}
              {chutes.map((c) => (
                <p key={c.id}>{c.nickname}</p>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ===================== EDIT MODE ===================== */}
      {mode === "edit" && (
        <div className="edit-container">

          {/* ---------- GANTRY ---------- */}
          <div className="card">
            <h2>Gantry Loader</h2>

            <label className="label">Name</label>
            <input
              className="input"
              value={gantry.nickname}
              onChange={(e) => setGantry({ ...gantry, nickname: e.target.value })}
            />

            <label className="label">Description</label>
            <input
              className="input"
              value={gantry.description}
              onChange={(e) =>
                setGantry({ ...gantry, description: e.target.value })
              }
              placeholder="Enter gantry description"
            />

            <label className="label">Controller</label>
            <select
              className="select"
              value={gantry.controller}
              onChange={(e) =>
                setGantry({ ...gantry, controller: e.target.value as any })
              }
            >
              <option value="">Select</option>
              <option value="Fanuc">Fanuc CNC</option>
              <option value="Mitsubishi">Mitsubishi PLC</option>
            </select>

            <label className="label">Host (IP)</label>
            <input
              className="input"
              value={gantry.host}
              onChange={(e) =>
                setGantry({ ...gantry, host: filterIP(e.target.value) })
              }
            />

            <label className="label">Port</label>
            <input
              className="input"
              value={gantry.port}
              onChange={(e) =>
                setGantry({ ...gantry, port: filterPort(e.target.value) })
              }
            />

            <label className="label">Series</label>
            <select
              className="select"
              value={gantry.series}
              onChange={(e) =>
                setGantry({ ...gantry, series: e.target.value })
              }
            >
              <option value="">Select</option>
              {gantry.controller === "Fanuc" && (
                <>
                  <option>GL Series</option>
                  <option>GX Series</option>
                  <option>GX-Twin Series</option>
                </>
              )}
              {gantry.controller === "Mitsubishi" && (
                <>
                  <option>GL-M Series</option>
                  <option>GX-M Series</option>
                  <option>GX-M Twin Series</option>
                </>
              )}
            </select>

            <label className="label">Axes</label>
            <select
              className="select"
              value={gantry.axes}
              onChange={(e) => setGantry({ ...gantry, axes: Number(e.target.value) })}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>

            <label className="label">Gripper Count</label>
            <select
              className="select"
              value={gantry.gripperCount}
              onChange={(e) =>
                setGantry({ ...gantry, gripperCount: Number(e.target.value) })
              }
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>

            <label className="label">Gripper Type</label>
            <select
              className="select"
              value={gantry.gripperType}
              onChange={(e) =>
                setGantry({ ...gantry, gripperType: e.target.value as any })
              }
            >
              <option value="">Select</option>
              <option value="Tilting">Tilting</option>
              <option value="Rotate">Rotate</option>
              <option value="X">X</option>
            </select>

          </div>

          {/* ---------- MACHINE ---------- */}
          <div className="card">
            <h2>Machine</h2>

            <label className="label">Machine Count</label>
            <select
              className="select"
              value={machineCount}
              onChange={(e) => updateMachineCount(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4, 5].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>

            {machines.map((m, index) => (
              <div className="sub-card" key={m.id}>
                <h3>{m.nickname}</h3>

                <label className="label">Name</label>
                <input
                  className="input"
                  value={m.nickname}
                  onChange={(e) => {
                    const list = [...machines];
                    list[index].nickname = e.target.value;
                    setMachines(list);
                  }}
                />

                <label className="label">Controller</label>
                <select
                  className="select"
                  value={m.controller}
                  onChange={(e) => {
                    const list = [...machines];
                    list[index].controller = e.target.value as any;
                    setMachines(list);
                  }}
                >
                  <option value="">Select</option>
                  <option value="Fanuc">Fanuc CNC</option>
                </select>

                <label className="label">Host (IP)</label>
                <input
                  className="input"
                  value={m.host}
                  onChange={(e) => {
                    const list = [...machines];
                    list[index].host = filterIP(e.target.value);
                    setMachines(list);
                  }}
                />

                <label className="label">Port</label>
                <input
                  className="input"
                  value={m.port}
                  onChange={(e) => {
                    const list = [...machines];
                    list[index].port = filterPort(e.target.value);
                    setMachines(list);
                  }}
                />
              </div>
            ))}
          </div>

          {/* ---------- STOCKER ---------- */}
          <div className="card">
            <h2>Stocker</h2>

            <label className="label">Stocker Count</label>
            <select
              className="select"
              value={stockerCount}
              onChange={(e) => updateStockerCount(Number(e.target.value))}
            >
              {[0, 1, 2].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>

            {stockers.map((s, index) => (
              <div className="sub-card" key={s.id}>
                <h3>{s.nickname}</h3>

                <label className="label">Name</label>
                <input
                  className="input"
                  value={s.nickname}
                  onChange={(e) => {
                    const list = [...stockers];
                    list[index].nickname = e.target.value;
                    setStockers(list);
                  }}
                />

                <label className="label">Type</label>
                <select
                  className="select"
                  value={s.type}
                  onChange={(e) => {
                    const list = [...stockers];
                    list[index].type = e.target.value as any;
                    setStockers(list);
                  }}
                >
                  <option value="">Select</option>
                  <option value="In">In Stocker</option>
                  <option value="Out">Out Stocker</option>
                  <option value="In/Out">In/Out Stocker</option>
                </select>
              </div>
            ))}
          </div>

          {/* ---------- TURNOVER ---------- */}
          <div className="card">
            <h2>Turnover</h2>

            <label className="label">Turnover Count</label>
            <select
              className="select"
              value={turnoverCount}
              onChange={(e) => updateTurnoverCount(Number(e.target.value))}
            >
              {[0, 1, 2].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>

            {turnovers.map((t, index) => (
              <div className="sub-card" key={t.id}>
                <h3>{t.nickname}</h3>

                <label className="label">Name</label>
                <input
                  className="input"
                  value={t.nickname}
                  onChange={(e) => {
                    const list = [...turnovers];
                    list[index].nickname = e.target.value;
                    setTurnovers(list);
                  }}
                />

                <label className="label">Mode</label>
                <select
                  className="select"
                  value={t.mode}
                  onChange={(e) => {
                    const list = [...turnovers];
                    list[index].mode = e.target.value as any;
                    setTurnovers(list);
                  }}
                >
                  <option value="">Select</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            ))}
          </div>

          {/* ---------- BUFFER ---------- */}
          <div className="card">
            <h2>Buffer</h2>

            <label className="label">Buffer Count</label>
            <select
              className="select"
              value={bufferCount}
              onChange={(e) => updateBufferCount(Number(e.target.value))}
            >
              {[0, 1, 2].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>

            {buffers.map((b, index) => (
              <div className="sub-card" key={b.id}>
                <h3>{b.nickname}</h3>

                <label className="label">Name</label>
                <input
                  className="input"
                  value={b.nickname}
                  onChange={(e) => {
                    const list = [...buffers];
                    list[index].nickname = e.target.value;
                    setBuffers(list);
                  }}
                />
              </div>
            ))}
          </div>

          {/* ---------- CHUTE ---------- */}
          <div className="card">
            <h2>Chute</h2>

            <label className="label">Chute Count</label>
            <select
              className="select"
              value={chuteCount}
              onChange={(e) => updateChuteCount(Number(e.target.value))}
            >
              {[0, 1, 2].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>

            {chutes.map((c, index) => (
              <div className="sub-card" key={c.id}>
                <h3>{c.nickname}</h3>

                <label className="label">Name</label>
                <input
                  className="input"
                  value={c.nickname}
                  onChange={(e) => {
                    const list = [...chutes];
                    list[index].nickname = e.target.value;
                    setChutes(list);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="next-container">
            <button className="next-btn" onClick={() => setMode("summary")}>
            next
            </button>
          </div>
        </div>
      )}

      <CustomModal
        open={savePopup}
        title="Save"
        message="Are you sure you want to Save all settings?"
        confirmText="Save"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={() => {
          //DB에 저장
          setSavePopup(false);
        }}
        onCancel={() => setSavePopup(false)}
      />

    </div>
  );
};

export default HardwareDefinitionPage;
