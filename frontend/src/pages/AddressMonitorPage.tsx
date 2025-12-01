import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTagValue, startTagPolling, stopTagPolling, getDataSets, createDataSet, getTags, createTag } from "../services/tagApi";
import { Tag } from "../types";
import "./AddressMonitorPage.css";

type ControllerType = "Fanuc" | "Mitsubishi" | "";

type AddressCell = {
  area: "D" | "R" | "M" | "X" | "Y";
  offset: number;
  raw: number;
  comment: string;
  bitComments: string[];
};

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

const ADDRESS_START = 0;
const ADDRESS_END = 300;
const GROUP_STORAGE_KEY = "addressMonitorGroups";
// @@@ 태그 네이밍이 d{offset}이 아닐 경우 여기에서 prefix를 교체하세요.
const TAG_PREFIX = "D";
// @@@ 필요 시 한 번만 태그/데이터셋 자동 등록하려면 true로 변경 후 실행 → 다시 false로 돌려두세요.
const RUN_SEED_ONCE = true;

const defaultCells: AddressCell[] = Array.from({ length: ADDRESS_END - ADDRESS_START + 1 }).map((_, i) => {
  const offset = ADDRESS_START + i;
  return {
    area: "D",
    offset,
    raw: 0, // mock 값 기본 0
    comment: `D${offset}`,
    bitComments: Array.from({ length: 16 }).map((__, idx) => `D${offset}.${idx}`),
  };
});

const AddressMonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const [controller, setController] = useState<ControllerType>("Mitsubishi");
  const [cells, setCells] = useState<AddressCell[]>(defaultCells);
  const [groupMode, setGroupMode] = useState<boolean>(false);
  const [groups, setGroups] = useState<AddressGroup[]>([]);
  const [popupComment, setPopupComment] = useState<string | null>(null);
  const pollTimer = useRef<NodeJS.Timeout | null>(null);

  // load controller and groups
  useEffect(() => {
    const savedHw = localStorage.getItem("appliedHardware");
    if (savedHw) {
      try {
        const parsed = JSON.parse(savedHw);
        setController(parsed?.gantry?.controller || "Mitsubishi");
      } catch {
        setController("Mitsubishi");
      }
    }
    const savedGroups = localStorage.getItem(GROUP_STORAGE_KEY);
    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups) as AddressGroup[]);
      } catch {
        setGroups([]);
      }
    }
  }, []);

  const byteWidth = useMemo(() => 2, []); // Mitsubishi 기준
  const bitCount = byteWidth * 8; // 16
  const bitHeaders = useMemo(
    () => ["F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0"],
    []
  );

  const bitArray = (raw: number) => {
    const bits: number[] = [];
    for (let i = bitCount - 1; i >= 0; i--) bits.push((raw >> i) & 1);
    return bits;
  };

  const parseValueByFormat = (raw: number, format: DisplayFormat) => {
    switch (format) {
      case "binary":
        return raw.toString(2).padStart(16, "0");
      case "hex":
        return "0x" + raw.toString(16).toUpperCase().padStart(4, "0");
      case "blank":
        return "";
      case "decimal":
      default:
        return raw.toString();
    }
  };

  const parseByDataType = (raw: number, dataType: DataType) => {
    switch (dataType) {
      case "WordSigned":
        return raw > 0x7fff ? raw - 0x10000 : raw;
      case "FloatSingle": {
        const buf = Buffer.allocUnsafe(4);
        buf.writeUInt16LE(raw & 0xffff, 0);
        buf.writeUInt16LE(0, 2);
        return buf.readFloatLE(0).toFixed(3);
      }
      case "String":
        return String.fromCharCode(raw & 0xff, (raw >> 8) & 0xff).trim();
      case "Time":
        return `${raw} ms`;
      default:
        return raw;
    }
  };

  const readWord = async (offset: number): Promise<number> => {
    try {
      // 가정: 태그 키가 d{offset} 형식으로 등록되어 있을 때
      const res = await getTagValue(`${TAG_PREFIX}${offset}`);
      const val = res?.value;
      if (typeof val === "number") return val;
      if (typeof val === "boolean") return val ? 1 : 0;
      return defaultCells[offset]?.raw ?? 0;
    } catch {
      return defaultCells[offset]?.raw ?? 0;
    }
  };

  const pollAllAddresses = async () => {
    const updated: AddressCell[] = [];
    for (let offset = ADDRESS_START; offset <= ADDRESS_END; offset++) {
      const raw = await readWord(offset);
      updated.push({
        area: "D",
        offset,
        raw,
        comment: `D${offset}`,
        bitComments: Array.from({ length: 16 }).map((__, idx) => `D${offset}.${idx}`),
      });
    }
    setCells(updated);
  };

  // 한 번만 시드: 이미 존재하면 건너뛰고, 없으면 생성
  const seedPlcMetadata = async () => {
    try {
      const dsList = await getDataSets();
      let dataSetId = dsList.find((d) => d.name === "address_block")?.id;

      if (!dataSetId) {
        const ds = await createDataSet({
          name: "address_block",
          addressType: "D",
          startAddress: ADDRESS_START,
          length: ADDRESS_END - ADDRESS_START + 1,
          pollingInterval: 100,
          enabled: true,
        });
        dataSetId = ds.id;
      }

      if (!dataSetId) return;

      const existingKeys = new Set((await getTags()).map((t) => t.key));
      // @@@ 태그 목록: D0~D300 기본 태그. 필요 시 범위/타입을 수정하세요.
      const seedTags: Array<Omit<Tag, "dataSetId">> = Array.from({
        length: ADDRESS_END - ADDRESS_START + 1,
      }).map((_, i) => ({
        key: `${TAG_PREFIX}${ADDRESS_START + i}`,
        description: `D${ADDRESS_START + i}`,
        offset: ADDRESS_START + i,
        dataType: "int16",
        wordLength: 1,
      }));

      for (const t of seedTags) {
        if (existingKeys.has(t.key)) continue;
        await createTag({ ...t, dataSetId });
      }
    } catch (err) {
      console.warn("Seed skipped/failed (address monitor)", err);
    }
  };

  useEffect(() => {
    if (RUN_SEED_ONCE) {
      seedPlcMetadata().catch((err) => console.warn("Seed error (address monitor)", err));
    }

    pollAllAddresses();
    startTagPolling().catch((err) => console.warn("Failed to start tag polling for address monitor", err));
    // @@@ 폴링 주기(ms) - 필요 시 숫자 변경
    const fetchInterval = 500; // 100ms fetch (주소 재읽기)
    // @@@ 화면 업데이트 주기(ms) - 필요 시 숫자 변경
    const renderInterval = 100; // 100ms render

    pollTimer.current = setInterval(pollAllAddresses, fetchInterval);
    const renderTimer = setInterval(() => {
      // 현재는 pollAllAddresses에서 setCells를 직접 업데이트하므로 별도 작업 없음.
      // 필요 시 추가 렌더 로직을 넣을 수 있음.
    }, renderInterval);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      clearInterval(renderTimer);
      stopTagPolling().catch((err) => console.warn("Failed to stop tag polling for address monitor", err));
    };
  }, []);

  const renderGroupRows = () => {
    return groups
      .filter((g) => g.visible !== false)
      .map((g) => {
        const rows = [];
        for (let i = 0; i < g.length; i++) {
          const offset = g.start + i;
          const cell = cells.find((c) => c.offset === offset);
          const raw = cell?.raw ?? 0;
          const bits = bitArray(raw);
          const displayVal = parseByDataType(raw, g.dataType);
          const formatted = parseValueByFormat(Number(displayVal) || raw, g.format);

          rows.push(
            <div
              className="table-row"
              style={{
                gridTemplateColumns: `repeat(1, 140px) repeat(${bitHeaders.length}, 1fr)`,
                columnGap: `10px`,
              }}
              key={`${g.id}-${offset}`}
            >
              <div className="col addr-col addr-label">{`D${offset}`}</div>
              {bitHeaders.map((h, idx) => (
                <div
                  key={h}
                  className="col bit-col bit-cell"
                  title={cell?.bitComments[idx] || ""}
                  onClick={() => setPopupComment(cell?.bitComments[idx] || "(no comment)")}
                >
                  {/* 코멘트는 클릭 시 팝업으로만 표시 */}
                  <div style={{ display: "none" }}>{cell?.bitComments[idx] || ""}</div>
                  <div className={`bit-value ${bits[idx] ? "on" : "off"}`}>{bits[idx]}</div>
                </div>
              ))}
              <div className="col val-col">{g.format === "blank" ? "" : formatted}</div>
            </div>
          );
        }
        return (
          <div className="group-block" key={g.id}>
            <div className="group-header">
              <h3>{g.name}</h3>
              <div className="group-meta">
                <span>{`D${g.start} ~ D${g.start + g.length - 1}`}</span>
                <span>{`Format: ${g.format}`}</span>
                <span>{`Type: ${g.dataType}`}</span>
              </div>
            </div>
            <div className="table">
              <div
                className="table-header"
                style={{
                  gridTemplateColumns: `repeat(1, 140px) repeat(${bitHeaders.length}, 1fr)`,
                  columnGap: `10px`,
                }}
              >
                <div className="col addr-col">Addr</div>
                {bitHeaders.map((h) => (
                  <div key={h} className="col bit-col header">
                    {h}
                  </div>
                ))}
                <div className="col val-col header">Value</div>
              </div>
              {rows}
            </div>
          </div>
        );
      });
  };

  return (
    <div className="address-page">
      <div className="address-header">
        <div>
          <h1>Address Monitor</h1>
          <p className="address-sub">Bit-level monitor (D0~D300)</p>
        </div>
        <div className="address-meta">
          <span className="chip">Controller: {controller || "Mitsubishi"}</span>
          <span className="chip">Byte width: {byteWidth} byte</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-actions">
          <button className="comment-btn secondary" onClick={() => navigate("/address-monitor/settings")}>
            Monitor Settings
          </button>
          <button className="comment-btn secondary" onClick={() => setGroupMode(!groupMode)}>
            {groupMode ? "All Address Mode" : "Group Mode"}
          </button>
        </div>
      </div>

      {!groupMode && (
        <div className="table-wrapper">
          <div className="table">
            <div
              className="table-header"
              style={{ gridTemplateColumns: `repeat(1, 140px) repeat(${bitHeaders.length}, 1fr)`, columnGap: `10px` }}
            >
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
                  style={{ gridTemplateColumns: `repeat(1, 140px) repeat(${bitHeaders.length}, 1fr)`, columnGap: `10px` }}
                  key={`${c.area}-${c.offset}`}
                >
                  <div className="col addr-col addr-label">
                    {c.area}
                    {c.offset}
                  </div>
                {bitHeaders.map((h, idx) => (
                  <div
                    key={h}
                    className="col bit-col bit-cell"
                    title={c.bitComments[idx] || ""}
                    onClick={() => setPopupComment(c.bitComments[idx] || "(no comment)")}
                  >
                    {/* 코멘트는 클릭 시 팝업으로만 표시 */}
                    <div style={{ display: "none" }}>{c.bitComments[idx] || ""}</div>
                    <div className={`bit-value ${bits[idx] ? "on" : "off"}`}>{bits[idx]}</div>
                  </div>
                ))}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {groupMode && (
        <div className="table-wrapper">
          {groups.length === 0 ? <div className="empty-state">No groups. 설정에서 그룹을 추가하세요.</div> : renderGroupRows()}
        </div>
      )}

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
