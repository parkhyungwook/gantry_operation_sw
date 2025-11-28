import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomModal from "../components/CustomModal";
import "./HardwareDefinitionEditPage.css";

/* ===================== TYPES ===================== */
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

type HardwareConfig = {
  id: number;
  applied: boolean;
  gantry: GantryConfig;
  machines: MachineUnit[];
};

/* ===================== MOCK DATA (타입 완벽 일치) ===================== */
const mockHardware: HardwareConfig[] = [
  {
    id: 1,
    applied: true,
    gantry: {
      nickname: "Gantry Loader A",
      description: "Main GL line",
      controller: "Fanuc",
      host: "192.168.0.10",
      port: "8193",
      series: "GL Series",
      axes: 3,
      gripperCount: 1,
      gripperType: "Rotate",
    },
    machines: [
      {
        id: 0,
        nickname: "Machine 1",
        controller: "Fanuc",
        host: "192.168.0.11",
        port: "8193",
      },
      {
        id: 1,
        nickname: "Machine 2",
        controller: "Fanuc",
        host: "192.168.0.12",
        port: "8193",
      },
    ],
  },
];

/* =================== DEFAULT (fallback) =================== */
const defaultGantry: GantryConfig = {
  nickname: "",
  description: "",
  controller: "",
  host: "",
  port: "",
  series: "",
  axes: 2,
  gripperCount: 0,
  gripperType: "",
};

/* ================================================== */

const HardwareDefinitionEditPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const data = mockHardware.find((h) => h.id === Number(id));

  /* ----- state 설정 (타입 100% 일치) ----- */
  const [gantry, setGantry] = useState<GantryConfig>(
    data?.gantry ? (data.gantry as GantryConfig) : defaultGantry
  );
  const [machines, setMachines] = useState<MachineUnit[]>(
    data?.machines ? (data.machines as MachineUnit[]) : []
  );

  const [original, setOriginal] = useState({
    gantry: data?.gantry ?? defaultGantry,
    machines: data?.machines ?? [],
  });

  const [savePopup, setSavePopup] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  /* ----- 변경 여부 감지 ----- */
  useEffect(() => {
    const changed =
      JSON.stringify({ gantry, machines }) !== JSON.stringify(original);
    setHasChanges(changed);
  }, [gantry, machines, original]);

  const filterIP = (v: string) => v.replace(/[^0-9.]/g, "");
  const filterPort = (v: string) => v.replace(/[^0-9]/g, "");

  if (!data) return <div style={{ padding: 20 }}>Configuration not found.</div>;

  return (
    <div className="hardware-page">
      <div className="edit-container">

        {/* HEADER */}
        <div className="edit-header">
          <h2>Edit Hardware Definition</h2>

          <div className="edit-btn-area">
            <button className="back-btn" onClick={() => navigate("/hardware")}>
              Back
            </button>

            <button
              className="save-btn"
              disabled={!hasChanges}
              onClick={() => setSavePopup(true)}
            >
              Save
            </button>
          </div>
        </div>

        {/* GANTRY */}
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
            onChange={(e) => setGantry({ ...gantry, description: e.target.value })}
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
            onChange={(e) => setGantry({ ...gantry, host: filterIP(e.target.value) })}
          />

          <label className="label">Port</label>
          <input
            className="input"
            value={gantry.port}
            onChange={(e) =>
              setGantry({ ...gantry, port: filterPort(e.target.value) })
            }
          />
        </div>

        {/* MACHINES */}
        <div className="card">
          <h2>Machines</h2>

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
      </div>

      <CustomModal
        open={savePopup}
        title="Save Changes"
        message="Save all modifications?"
        confirmText="Save"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={() => {
          setOriginal({ gantry, machines });
          setSavePopup(false);
          navigate("/hardware");
        }}
        onCancel={() => setSavePopup(false)}
      />
    </div>
  );
};

export default HardwareDefinitionEditPage;
