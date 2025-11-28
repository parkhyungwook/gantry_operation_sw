// src/pages/ProcessPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomModal from "../components/CustomModal";
import "./ProcessPage.css";

type FunctionGroup = "Gantry" | "Machine" | "Stocker" | "Turnover" | "Buffer" | "Etc";

type ProcessStepConfig = {
  param1?: string;
  param2?: string;
  comment?: string;
};

type ProcessStep = {
  id: string;
  templateId: string;
  name: string;
  group: FunctionGroup;
  config: ProcessStepConfig;
};

type ProcessRow = {
  id: number;
  applied: boolean;
  name: string;
  description: string;
  steps?: ProcessStep[];
  hardware?: {
    id?: string;
    name?: string;
    controller?: string;
    description?: string;
    gantry?: {
      nickname?: string;
      description?: string;
      controller?: string;
      host?: string;
      port?: string;
      series?: string;
      axes?: number;
      gripperCount?: number;
      gripperType?: string;
    };
    machines?: { id: number; nickname: string; controller?: string; host?: string; port?: string }[];
    stockers?: { id: number; nickname: string; type?: string }[];
    turnovers?: { id: number; nickname: string; mode?: string }[];
    buffers?: { id: number; nickname: string }[];
    chutes?: { id: number; nickname: string }[];
  };
};

const initialProcesses: ProcessRow[] = [
  {
    id: 1,
    applied: true,
    name: "Main Production Process",
    description: "Full sequence for GL Main Line",
    hardware: {
      id: "hw-1",
      name: "Gantry Loader A",
      controller: "Fanuc",
      description: "Main GL Line",
      gantry: {
        nickname: "Gantry Loader A",
        description: "Main GL Line",
        controller: "Fanuc",
        host: "192.168.0.10",
        port: "8193",
        series: "GL Series",
        axes: 3,
        gripperCount: 1,
        gripperType: "Rotate",
      },
      machines: [
        { id: 0, nickname: "Machine 1", controller: "Fanuc", host: "192.168.0.11", port: "8193" },
      ],
      stockers: [],
      turnovers: [],
      buffers: [],
      chutes: [],
    },
    steps: [
      {
        id: "step-1",
        templateId: "gantry-pick",
        name: "Pick from Machine",
        group: "Gantry",
        config: { param1: "Machine A", param2: "Slot 1", comment: "Start" },
      },
      {
        id: "step-2",
        templateId: "machine-start",
        name: "Start Cycle",
        group: "Machine",
        config: { param1: "Cycle A", param2: "Program 01" },
      },
      {
        id: "step-3",
        templateId: "gantry-place",
        name: "Place to Machine",
        group: "Gantry",
        config: { param1: "Machine B", param2: "Slot 2" },
      },
    ],
  },
  {
    id: 2,
    applied: false,
    name: "Backup Test Process",
    description: "Spare testing workflow",
    hardware: {
      id: "hw-2",
      name: "Backup Config B",
      controller: "Fanuc",
      description: "Test Line",
      gantry: {
        nickname: "Gantry Loader A",
        description: "Main GL Line",
        controller: "Fanuc",
        host: "192.168.0.10",
        port: "8193",
        series: "GL Series",
        axes: 3,
        gripperCount: 1,
        gripperType: "Rotate",
      },
      machines: [],
      stockers: [],
      turnovers: [],
      buffers: [],
      chutes: [],
    },
    steps: [
      {
        id: "backup-1",
        templateId: "gantry-home",
        name: "Move Home",
        group: "Gantry",
        config: { param1: "Safe Pos", param2: "" },
      },
      {
        id: "backup-2",
        templateId: "delay",
        name: "Delay",
        group: "Etc",
        config: { param1: "3s", param2: "" },
      },
      {
        id: "backup-3",
        templateId: "stocker-in",
        name: "Load Stocker",
        group: "Stocker",
        config: { param1: "Slot 1", param2: "" },
      },
    ],
  },
];

const ProcessPage: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<ProcessRow[]>(initialProcesses);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [accessPopup, setAccessPopup] = useState(false);
  const [hardwareOpenId, setHardwareOpenId] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!cardRef.current) return;
      if (!cardRef.current.contains(event.target as Node)) {
        setSelectedId(null);
        setExpandedId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAccessProcess = () => {
    if (selectedId == null) return;

    setRows((prev) =>
      prev.map((p) => ({
        ...p,
        applied: p.id === selectedId,
      }))
    );
    setAccessPopup(false);
  };

  const toggleSelectRow = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setExpandedId((prev) => (prev === id ? null : id));
    setHardwareOpenId(null);
  };

  const handleEditProcess = (row: ProcessRow) => {
    setSelectedId(row.id);
    navigate(`/process/edit/${row.id}`, { state: { process: row } });
  };

  const selectedRow = rows.find((r) => r.id === selectedId) || null;

  return (
    <div className="proc-list-page">
      <div className="proc-list-inner">
        <div className="proc-list-header">
          <h2>Process List</h2>

          <button
            className="proc-add-btn"
            onClick={() => navigate("/process/add")}
          >
            + Add Process
          </button>
        </div>

        <div className="proc-list-card" ref={cardRef}>
          <table className="proc-table">
            <thead>
              <tr>
                <th>Applied</th>
                <th>Process Name</th>
                <th>Description</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={"proc-row" + (selectedId === row.id ? " selected" : "")}
                    onClick={() => toggleSelectRow(row.id)}
                  >
                    <td>
                      {row.applied ? (
                        <span className="proc-ok">O</span>
                      ) : (
                        <span className="proc-ng">X</span>
                      )}
                    </td>
                    <td>{row.name}</td>
                    <td>{row.description}</td>
                  </tr>

                  {expandedId === row.id && (
                    <tr className="proc-details-row">
                      <td colSpan={3}>
                        <div className="proc-details">
                          <div className="proc-details-header">
                            <h3>Summary</h3>
                            <div className="proc-detail-actions">
                              <button
                                className="proc-access-inline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(row.id);
                                  setAccessPopup(true);
                                }}
                              >
                                Apply
                              </button>
                              <button
                                className="proc-edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProcess(row);
                                }}
                              >
                                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                                  <path d="M14.54 3.46a1.5 1.5 0 0 1 2.12 2.12l-8.9 8.9-3.42.57.57-3.42zM12.42 5.58 5.7 12.3l-.22 1.33 1.33-.22 6.72-6.72z"></path>
                                </svg>
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>

                          <div className="proc-flow-summary">
                            <div className="proc-flow-head">
                              <div>
                                <p className="proc-info-label">Process Name</p>
                                <h4 className="proc-info-title">{row.name}</h4>
                                <p className="proc-info-desc">{row.description || "-"}</p>
                              </div>
                              <div className="proc-badge">{row.applied ? "Applied" : "Draft"}</div>
                            </div>

                            <div className="proc-hw-accordion">
                              <button
                                className="proc-hw-toggle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHardwareOpenId((prev) => (prev === row.id ? null : row.id));
                                }}
                              >
                                <span>Hardware Definition</span>
                                <span className="proc-hw-toggle-icon">{hardwareOpenId === row.id ? "▲" : "▼"}</span>
                              </button>
                              {hardwareOpenId === row.id && (
                                <div className="proc-hw-body">
                                  <p>
                                    <strong>Name:</strong> {row.hardware?.name || "-"}
                                  </p>
                                  <p>
                                    <strong>Controller:</strong> {row.hardware?.controller || "-"}
                                  </p>
                                  <p>
                                    <strong>Description:</strong> {row.hardware?.description || "-"}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="proc-flow-list">
                              {(!row.steps || row.steps.length === 0) && (
                                <div className="proc-flow-placeholder">No steps yet</div>
                              )}
                              {row.steps?.map((s, idx) => (
                                <div key={s.id} className="proc-flow-step">
                                  <div className="proc-step-line">
                                    <div className="proc-step-index">Step {idx + 1}</div>
                                    <div className="proc-step-name">
                                      {s.name}
                                      <span className="proc-step-chip inline">{s.group}</span>
                                    </div>
                                  </div>
                                  {s.config.comment && <div className="proc-step-comment">{s.config.comment}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CustomModal
        open={accessPopup}
        title="Apply Process"
        message={
          selectedRow ? `Apply "${selectedRow.name}" as active process?` : "No process selected."
        }
        confirmText="Apply"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={handleAccessProcess}
        onCancel={() => setAccessPopup(false)}
      />
    </div>
  );
};

export default ProcessPage;
