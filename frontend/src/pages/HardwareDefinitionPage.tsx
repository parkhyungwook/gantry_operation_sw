// src/pages/HardwareDefinitionListPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomModal from "../components/CustomModal";
import "./HardwareDefinitionPage.css";

type HardwareRow = {
  id: number;
  applied: boolean;
  name: string;
  description: string;

  // ▼ Add/Edit 페이지에서 사용하는 실제 구조
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

  machines: {
    id: number;
    nickname: string;
    controller: "Fanuc" | "";
    host: string;
    port: string;
  }[];

  stockers: {
    id: number;
    nickname: string;
    type: "In" | "Out" | "In/Out" | "";
  }[];

  turnovers: {
    id: number;
    nickname: string;
    mode: "A" | "B" | "C" | "";
  }[];

  buffers: {
    id: number;
    nickname: string;
  }[];

  chutes: {
    id: number;
    nickname: string;
  }[];
};

const emptyGantry = {
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

const initialData: HardwareRow[] = [
  {
    id: 1,
    applied: true,
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

  {
    id: 2,
    applied: false,
    name: "Backup Config B",
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
];

const HardwareDefinitionListPage: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<HardwareRow[]>(initialData);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // 저장된 적용 설정을 불러와 목록/선택 상태를 맞춰준다.
  useEffect(() => {
    const saved = localStorage.getItem("appliedHardware");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as HardwareRow;
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          applied: row.id === parsed.id,
        }))
      );
      setSelectedId(parsed.id ?? null);
    } catch (err) {
      console.warn("Failed to parse applied hardware from storage", err);
    }
  }, []);

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

  const handleAccessConfirm = () => {
    if (selectedId == null) {
      setAccessPopup(false);
      return;
    }

    // 아직 백엔드 없음 → 프론트에서만 applied 상태 변경
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        applied: row.id === selectedId,
      }))
    );

    const selectedRow = rows.find((r) => r.id === selectedId);
    if (selectedRow) {
      localStorage.setItem("appliedHardware", JSON.stringify(selectedRow));
    }

    setAccessPopup(false);
  };

  const selectedRow = rows.find((r) => r.id === selectedId) || null;

  return (
    <div className="hd-list-page">
      <div className="hd-list-inner">
        {/* 헤더 */}
        <div className="hd-list-header">
          <h2>Hardware Definition List</h2>

          <button
            className="hd-add-btn"
            onClick={() => navigate("/hardware/add")}
          >
            + Add Definition
          </button>
        </div>

        {/* 카드 + 테이블 */}
        <div className="hd-list-card" ref={cardRef}>
          <table className="hd-table">
            <thead>
              <tr>
                <th>Applied</th>
                <th>Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={"hd-row" + (selectedId === row.id ? " selected" : "")}
                    onClick={() => handleRowClick(row.id)}
                  >
                    <td>
                      {row.applied ? (
                        <span className="hd-status-ok">O</span>
                      ) : (
                        <span className="hd-status-ng">X</span>
                      )}
                    </td>
                    <td>{row.name}</td>
                    <td>{row.description}</td>
                  </tr>

                  {/* 클릭 시 아래에 요약 뷰 펼치기 */}
                  {expandedId === row.id && (
                    <tr className="hd-details-row">
                      <td colSpan={3}>
                        <div className="hd-details">

                          <div className="hd-details-header">
                            <h3>Summary</h3>
                            <div className="hd-detail-actions">
                              <button
                                className="hd-access-inline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(row.id);
                                  setAccessPopup(true);
                                }}
                              >
                                Apply
                              </button>
                              <button
                                className="hd-edit-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/hardware/edit/${row.id}`);
                                }}
                              >
                                Edit
                              </button>
                            </div>
                          </div>

                          {/* === HardwareDefinitionPage SUMMARY와 동일 === */}
                          <div className="summary-sections">

                            {/* GANTRY */}
                            <div className="summary-card">
                              <h3>Gantry Loader</h3>
                              <p><strong>Name:</strong> {row.gantry.nickname || "-"}</p>
                              <p><strong>Description:</strong> {row.gantry.description || "-"}</p>
                              <p><strong>Controller:</strong> {row.gantry.controller || "-"}</p>
                              <p><strong>Host:</strong> {row.gantry.host || "-"}</p>
                              <p><strong>Port:</strong> {row.gantry.port || "-"}</p>
                              <p><strong>Series:</strong> {row.gantry.series || "-"}</p>
                              <p><strong>Axes:</strong> {row.gantry.axes}</p>
                              <p><strong>Grippers:</strong> {row.gantry.gripperCount}</p>
                              <p><strong>Gripper Type:</strong> {row.gantry.gripperType || "-"}</p>
                            </div>

                            {/* MACHINE */}
                            <div className="summary-card">
                              <h3>Machines</h3>
                              {row.machines.length === 0 && <p>- None -</p>}
                              {row.machines.map((m: any) => (
                                <p key={m.id}>
                                  {m.nickname}: {m.controller || "-"} / {m.host}:{m.port}
                                </p>
                              ))}
                            </div>

                            {/* STOCKER */}
                            <div className="summary-card">
                              <h3>Stockers</h3>
                              {(!row.stockers || row.stockers.length === 0) && <p>- None -</p>}
                              {row.stockers?.map((s: any) => (
                                <p key={s.id}>{s.nickname}: {s.type || "-"}</p>
                              ))}
                            </div>

                            {/* TURNOVER */}
                            <div className="summary-card">
                              <h3>Turnovers</h3>
                              {(!row.turnovers || row.turnovers.length === 0) && <p>- None -</p>}
                              {row.turnovers?.map((t: any) => (
                                <p key={t.id}>{t.nickname}: {t.mode || "-"}</p>
                              ))}
                            </div>

                            {/* BUFFER */}
                            <div className="summary-card">
                              <h3>Buffers</h3>
                              {(!row.buffers || row.buffers.length === 0) && <p>- None -</p>}
                              {row.buffers?.map((b: any) => (
                                <p key={b.id}>{b.nickname}</p>
                              ))}
                            </div>

                            {/* CHUTE */}
                            <div className="summary-card">
                              <h3>Chutes</h3>
                              {(!row.chutes || row.chutes.length === 0) && <p>- None -</p>}
                              {row.chutes?.map((c: any) => (
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

      {/* Access 팝업 */}
      <CustomModal
        open={accessPopup}
        title="Apply Configuration"
        message={
          selectedRow
            ? `Do you want to apply "${selectedRow.name}"?`
            : "No configuration selected."
        }
        confirmText="Apply"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={handleAccessConfirm}
        onCancel={() => setAccessPopup(false)}
      />
    </div>
  );
};

export default HardwareDefinitionListPage;
