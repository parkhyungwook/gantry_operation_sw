import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddressMonitorPage.css";

type ControllerType = "Fanuc" | "Mitsubishi" | "";

type AddressCell = {
  area: "D" | "R" | "M" | "X" | "Y";
  offset: number;
  raw: number;
  comment: string;
  bitComments: string[];
};

const DEFAULT_CELLS: AddressCell[] = Array.from({ length: 32 }).map((_, i) => ({
  area: "D",
  offset: 300 + i,
  raw: (i * 13) % 256,
  comment: `Comment ${300 + i}`,
  bitComments: Array.from({ length: 16 }).map((__, idx) => `B${idx}`),
}));

const AddressMonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const [controller, setController] = useState<ControllerType>("");
  const [cells, setCells] = useState<AddressCell[]>(DEFAULT_CELLS);
  const [popupComment, setPopupComment] = useState<string | null>(null);

  // 적용된 하드웨어 및 저장된 맵 로드
  useEffect(() => {
    const savedHw = localStorage.getItem("appliedHardware");
    if (savedHw) {
      try {
        const parsed = JSON.parse(savedHw);
        setController(parsed?.gantry?.controller || "");
      } catch {}
    }
    const savedCells = localStorage.getItem("addressMonitorCells");
    if (savedCells) {
      try {
        const parsed = JSON.parse(savedCells) as AddressCell[];
        setCells(parsed);
      } catch {}
    }
  }, []);

  const byteWidth = useMemo(() => (controller === "Mitsubishi" ? 2 : 1), [controller]);
  const bitCount = byteWidth * 8;
  const bitHeaders = useMemo(
    () => (byteWidth === 2 ? ["F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0"] : ["7", "6", "5", "4", "3", "2", "1", "0"]),
    [byteWidth]
  );

  const bitArray = (raw: number) => {
    const bits: number[] = [];
    for (let i = bitCount - 1; i >= 0; i--) bits.push((raw >> i) & 1);
    return bits;
  };

  const addrColWidth = 140;
  const gap = 10;

  return (
    <div className="address-page">
      <div className="address-header">
        <div>
          <h1>Address Monitor</h1>
          <p className="address-sub">Bit-level monitor</p>
        </div>
        <div className="address-meta">
          <span className="chip">Controller: {controller || "Unknown"}</span>
          <span className="chip">Byte width: {byteWidth} byte</span>
        </div>
      </div>

      <div className="toolbar">
        <div />
        <div className="toolbar-actions">
          <button className="comment-btn secondary" onClick={() => navigate("/address-monitor/edit")}>
            Go to Comment Editor
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table">
          <div className="table-header" style={{ gridTemplateColumns: `repeat(1, ${addrColWidth}px) repeat(${bitHeaders.length}, 1fr)`, columnGap: `${gap}px` }}>
            <div className="col addr-col">Addr</div>
            {bitHeaders.map((h) => (
              <div key={h} className="col bit-col header">
                {h}
              </div>
            ))}
          </div>
          {cells.map((c) => {
            const bits = bitArray(c.raw);
            return (
              <div
                className="table-row"
                style={{ gridTemplateColumns: `repeat(1, ${addrColWidth}px) repeat(${bitHeaders.length}, 1fr)`, columnGap: `${gap}px` }}
                key={`${c.area}-${c.offset}`}
              >
                <div className="col addr-col addr-label">
                  {c.area}
                  {c.offset}
                </div>
                {bitHeaders.map((h, idx) => (
                  <div key={h} className="col bit-col bit-cell" onClick={() => setPopupComment(c.bitComments[idx] || "(no comment)")}>
                    <div className="bit-comment" title={c.bitComments[idx] || ""}>
                      {c.bitComments[idx] || ""}
                    </div>
                    <div className={`bit-value ${bits[idx] ? "on" : "off"}`}>{bits[idx]}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {popupComment && (
        <div className="comment-overlay" onClick={() => setPopupComment(null)}>
          <div
            className="comment-popup"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button className="popup-close" onClick={() => setPopupComment(null)}>
              ×
            </button>
            <div className="popup-body">{popupComment}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressMonitorPage;
