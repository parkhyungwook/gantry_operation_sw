// src/pages/HardwareDefinitionListPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HardwareDefinitionPage.css";

type HardwareRow = {
  id: number;
  name: string;
  description: string;
  gantry: {
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
  machines: { id: number; nickname: string; controller: "Fanuc" | ""; host: string; port: string }[];
  stockers: { id: number; nickname: string; type: "In" | "Out" | "In/Out" | "" }[];
  turnovers: { id: number; nickname: string; mode: "A" | "B" | "C" | "" }[];
  buffers: { id: number; nickname: string }[];
  chutes: { id: number; nickname: string }[];
};

const initialData: HardwareRow[] = [
  {
    id: 1,
    name: "Gantry Loader A",
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
      {
        id: 0,
        nickname: "Machine 1",
        controller: "Fanuc",
        host: "192.168.0.11",
        port: "8193",
      },
    ],
    stockers: [],
    turnovers: [],
    buffers: [],
    chutes: [],
  },
];

const HardwareDefinitionListPage: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<HardwareRow[]>(initialData);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  const handleRowClick = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDeleteRow = (id: number) => {
    if (!window.confirm("Delete this hardware definition?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedId(null);
    setExpandedId(null);
  };

  return (
    <div className="hd-list-page">
      <div className="hd-list-inner">
        <div className="hd-list-header">
          <h2>Hardware Definition List</h2>
          <button className="hd-add-btn" onClick={() => navigate("/hardware/add")}>
            + Add Definition
          </button>
        </div>

        <div className="hd-list-card" ref={cardRef}>
          <table className="hd-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={"hd-row" + (selectedId === row.id ? " selected" : "")}
                    onClick={() => handleRowClick(row.id)}
                  >
                    <td>{idx + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.description}</td>
                  </tr>

                  {expandedId === row.id && (
                    <tr className="hd-details-row">
                      <td colSpan={3}>
                        <div className="hd-details">
                          <div className="hd-details-header">
                            <h3>Summary</h3>
                            <div className="hd-detail-actions-inline">
                              <button
                                className="proc-edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/hardware/edit/${row.id}`);
                                }}
                              >
                                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                                  <path d="M14.54 3.46a1.5 1.5 0 0 1 2.12 2.12l-8.9 8.9-3.42.57.57-3.42zM12.42 5.58 5.7 12.3l-.22 1.33 1.33-.22 6.72-6.72z"></path>
                                </svg>
                                <span>Edit</span>
                              </button>
                              <button
                                className="proc-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRow(row.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="summary-sections">
                            <div className="summary-card">
                              <h3>Gantry Loader</h3>
                              <p>
                                <strong>Name:</strong> {row.gantry.nickname || "-"}
                              </p>
                              <p>
                                <strong>Description:</strong> {row.gantry.description || "-"}
                              </p>
                              <p>
                                <strong>Controller:</strong> {row.gantry.controller || "-"}
                              </p>
                              <p>
                                <strong>Host:</strong> {row.gantry.host || "-"}
                              </p>
                              <p>
                                <strong>Port:</strong> {row.gantry.port || "-"}
                              </p>
                              <p>
                                <strong>Series:</strong> {row.gantry.series || "-"}
                              </p>
                              <p>
                                <strong>Axes:</strong> {row.gantry.axes}</p>
                              <p>
                                <strong>Grippers:</strong> {row.gantry.gripperCount}
                              </p>
                              <p>
                                <strong>Gripper Type:</strong> {row.gantry.gripperType || "-"}
                              </p>
                            </div>

                            <div className="summary-card">
                              <h3>Machines</h3>
                              {row.machines.length === 0 && <p>- None -</p>}
                              {row.machines.map((m) => (
                                <p key={m.id}>
                                  {m.nickname}: {m.controller || "-"} / {m.host}:{m.port}
                                </p>
                              ))}
                            </div>

                            <div className="summary-card">
                              <h3>Stockers</h3>
                              {(!row.stockers || row.stockers.length === 0) && <p>- None -</p>}
                              {row.stockers?.map((s) => (
                                <p key={s.id}>{s.nickname}: {s.type || "-"}</p>
                              ))}
                            </div>

                            <div className="summary-card">
                              <h3>Turnovers</h3>
                              {(!row.turnovers || row.turnovers.length === 0) && <p>- None -</p>}
                              {row.turnovers?.map((t) => (
                                <p key={t.id}>{t.nickname}: {t.mode || "-"}</p>
                              ))}
                            </div>

                            <div className="summary-card">
                              <h3>Buffers</h3>
                              {(!row.buffers || row.buffers.length === 0) && <p>- None -</p>}
                              {row.buffers?.map((b) => (
                                <p key={b.id}>{b.nickname}</p>
                              ))}
                            </div>

                            <div className="summary-card">
                              <h3>Chutes</h3>
                              {(!row.chutes || row.chutes.length === 0) && <p>- None -</p>}
                              {row.chutes?.map((c) => (
                                <p key={c.id}>{c.nickname}</p>
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
    </div>
  );
};

export default HardwareDefinitionListPage;
