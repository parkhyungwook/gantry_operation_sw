import React, { useEffect, useMemo, useState } from "react";
import CustomModal from "../components/CustomModal";
import "./AddressMonitorPage.css";

type ControllerType = "Fanuc" | "Mitsubishi" | "";

type AddressCell = {
  area: "D" | "R" | "M" | "X" | "Y";
  offset: number;
  raw: number;
  comment: string;
  bitComments: string[];
};

const AddressCommentEditPage: React.FC = () => {
  const [cells, setCells] = useState<AddressCell[]>([]);
  const [controller, setController] = useState<ControllerType>("");
  const [showApply, setShowApply] = useState(false);

  // 한국어 주석: 저장된 모니터 데이터 불러오기
  useEffect(() => {
    const savedCells = localStorage.getItem("addressMonitorCells");
    if (savedCells) {
      try {
        const parsed = JSON.parse(savedCells) as AddressCell[];
        setCells(parsed);
      } catch {}
    }
    const savedHw = localStorage.getItem("appliedHardware");
    if (savedHw) {
      try {
        const parsed = JSON.parse(savedHw);
        setController(parsed?.gantry?.controller || "");
      } catch {}
    }
  }, []);

  const bitCount = useMemo(() => (controller === "Mitsubishi" ? 16 : 8), [controller]);

  const addrColWidth = 140;
  const gap = 10;
  const tableTemplate = `repeat(1, ${addrColWidth}px) repeat(${bitCount}, 1fr)`;

  const exportTemplate = () => {
    const rows: string[][] = [["Area", "Offset", "Raw", ...Array.from({ length: bitCount }).map((_, i) => `Bit${i}`)]];
    cells.forEach((c) => {
      const bitComments = c.bitComments.slice(0, bitCount);
      rows.push([
        c.area,
        c.offset.toString(),
        c.raw.toString(),
        ...bitComments,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "address-comments.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      const lines = text.split(/\r?\n/).filter(Boolean);
      const [, ...data] = lines;
      const next = [...cells];
      data.forEach((line) => {
        const cols = line.split(",");
        if (cols.length < 3) return;
        const first = cols[0]?.replace(/"/g, "");
        const area = first as AddressCell["area"];
        const offset = Number(cols[1]?.replace(/"/g, ""));
        const bComments = cols.slice(3).map((v) => v?.replace(/"/g, ""));
        const idx = next.findIndex((c) => c.area === area && c.offset === offset);
        if (idx >= 0) {
          const padded = [...bComments];
          while (padded.length < bitCount) padded.push("");
          next[idx] = { ...next[idx], bitComments: padded.slice(0, bitCount) };
        }
      });
      setCells(next);
      setShowApply(true);
    };
    reader.readAsText(file);
  };

  const applyChanges = () => {
    localStorage.setItem("addressMonitorCells", JSON.stringify(cells));
    setShowApply(false);
  };

  return (
    <div className="address-page">
      <div className="address-header">
        <div>
          <h1>Address Comment Editor</h1>
          <p className="address-sub">Download template, edit, and import back to sync monitor view.</p>
        </div>
        <div className="address-meta">
          <span className="chip">Controller: {controller || "Unknown"}</span>
          <span className="chip">Bit count: {bitCount}</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-actions">
          <button className="export-btn" onClick={exportTemplate}>
            Download XLSX Template
          </button>
          <label className="import-btn">
            Import XLSX
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table">
          <div className="table-header" style={{ gridTemplateColumns: tableTemplate, columnGap: `${gap}px` }}>
            <div className="col addr-col">Addr</div>
            {Array.from({ length: bitCount }).map((_, idx) => (
              <div key={idx} className="col bit-col header">
                {bitCount - 1 - idx}
              </div>
            ))}
          </div>
          {cells.map((c, idx) => (
            <div
              key={`${c.area}-${c.offset}`}
              className="table-row"
              style={{ gridTemplateColumns: tableTemplate, columnGap: `${gap}px` }}
            >
              <div className="col addr-col addr-label">
                {c.area}
                {c.offset}
              </div>
              {Array.from({ length: bitCount }).map((_, bIdx) => (
                <div key={bIdx} className="col bit-col bit-cell edit-cell">
                  <input
                    className="bit-input"
                    value={c.bitComments[bIdx] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCells((prev) => {
                        const next = [...prev];
                        const target = { ...next[idx] };
                        const bits = [...target.bitComments];
                        bits[bIdx] = val;
                        target.bitComments = bits;
                        next[idx] = target;
                        return next;
                      });
                    }}
                    placeholder="Bit comment"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <CustomModal
        open={showApply}
        title="Apply imported comments?"
        message="Overwrite current comments with imported file?"
        confirmText="Apply"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={applyChanges}
        onCancel={() => setShowApply(false)}
      />
    </div>
  );
};

export default AddressCommentEditPage;
