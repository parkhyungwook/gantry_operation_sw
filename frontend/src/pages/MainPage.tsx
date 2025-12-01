import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getDataSets,
  getTags,
  getTagValue,
  createDataSet,
  createTag,
  startTagPolling,
  stopTagPolling,
  writeTagValue,
} from "../services/tagApi";
import { Tag } from "../types";
import "./MainPage.css";

type AxisState = {
  pos: number;
  ref: boolean;
  load: number;
};

type GantryConfig = {
  nickname?: string;
  description?: string;
  controller?: "Fanuc" | "Mitsubishi" | "";
  host?: string;
  port?: string;
  series?: string;
  axes: number;
  gripperCount: number;
  gripperType?: "Tilting" | "Rotate" | "X" | "";
};

type AppliedHardware = {
  id: number;
  applied: boolean;
  name?: string;
  description?: string;
  gantry: GantryConfig;
};

const fallbackHardware: AppliedHardware = {
  id: 0,
  applied: true,
  name: "Default",
  description: "Fallback configuration",
  gantry: {
    nickname: "Gantry Loader",
    description: "Default configuration",
    controller: "",
    host: "",
    port: "",
    series: "",
    axes: 3,
    gripperCount: 0,
    gripperType: "",
  },
};

const fallbackAxisData: Record<string, AxisState> = {
  X: { pos: 0, ref: true, load: 0 },
  Y: { pos: 0, ref: false, load: 0 },
  Z: { pos: 0, ref: true, load: 0 },
  C: { pos: 0, ref: false, load: 0 },
};

const feedrate = 0;

// 실제 태그 이름에 맞게 교체하세요.
// @@@ TAG 추가: position/load/feedrate/trigger에 키를 추가/교체하면 됨
const TAG_KEYS = {
  // @@@ Position 예) U/W 축 추가하려면 아래에 W:"w_position" 형태로 추가
  position: { X: "x_position", Y: "y_position", Z: "z_position", C: "c_position" },
  // @@@ Load 예) W 로드 추가하려면 W:"w_load" 추가
  load: { X: "x_load", Y: "y_load", Z: "z_load", C: "c_load" },
  // @@@ Feedrate 태그명 교체 시 여기 수정
  feedrate: "feedrate",
  // @@@ Trigger(D0.0) 태그명 교체 시 여기 수정
  trigger: "move_trigger", // D0.0 토글용 Tag key
};

const axisOrder = ["X", "Y", "Z", "C", "B", "A"];

// 개발 중 한 번만 실행하려면 true로 바꾼 뒤 실행, 다시 false로 돌려두세요.
// @@@ 시드에 태그/주소를 추가하려면 seedTags 배열을 수정
const RUN_SEED_ONCE = false;

const MainPage: React.FC = () => {
  const [panel, setPanel] = useState<number>(1);
  const [appliedHardware, setAppliedHardware] = useState<AppliedHardware | null>(null);
  const [axisData, setAxisData] = useState<Record<string, AxisState>>(fallbackAxisData);
  const [feedrateValue, setFeedrateValue] = useState<number>(feedrate);
  const [triggerOn, setTriggerOn] = useState<boolean>(false);

  const latestAxisRef = useRef<Record<string, AxisState>>(fallbackAxisData);
  const latestFeedrateRef = useRef<number>(feedrate);

  useEffect(() => {
    const saved = localStorage.getItem("appliedHardware");
    if (!saved) return;

    try {
      setAppliedHardware(JSON.parse(saved) as AppliedHardware);
    } catch (err) {
      console.warn("Failed to read applied hardware from storage", err);
    }
  }, []);

  const axes = useMemo(() => {
    const count = appliedHardware?.gantry?.axes || fallbackHardware.gantry.axes;
    return axisOrder.slice(0, Math.max(0, count));
  }, [appliedHardware]);

  useEffect(() => {
    const defaultState: AxisState = { pos: 0, ref: false, load: 0 };
    const fallbackList = Object.values(fallbackAxisData);
    const next = axes.reduce((acc, axis, index) => {
      const fallback = fallbackAxisData[axis] ?? fallbackList[index] ?? defaultState;
      acc[axis] = fallback;
      return acc;
    }, {} as Record<string, AxisState>);
    setAxisData(next);
    latestAxisRef.current = next;
  }, [axes]);

  // 한 번만 시드: 이미 존재하면 건너뛰고, 없으면 생성
  const seedPlcMetadata = async () => {
    try {
      const dsList = await getDataSets();
      let dataSetId = dsList.find((d) => d.name === "motion_block")?.id;

      if (!dataSetId) {
        const ds = await createDataSet({
          name: "motion_block",
          addressType: "D",
          startAddress: 0,
          length: 20,
          pollingInterval: 100,
          enabled: true,
        });
        dataSetId = ds.id;
      }

      if (!dataSetId) return;

      const existingKeys = new Set((await getTags()).map((t) => t.key));
      // @@@ 태그 목록: 읽고 싶은 주소/키를 추가/수정할 때 여기를 변경
      const seedTags: Array<Omit<Tag, "dataSetId">> = [
        { key: TAG_KEYS.position.X, description: "X pos", offset: 2, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.position.Y, description: "Y pos", offset: 4, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.position.Z, description: "Z pos", offset: 6, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.position.C, description: "C pos", offset: 8, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.load.X, description: "X load", offset: 10, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.load.Y, description: "Y load", offset: 12, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.load.Z, description: "Z load", offset: 14, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.load.C, description: "C load", offset: 16, dataType: "real", wordLength: 2 },
        { key: TAG_KEYS.feedrate, description: "Feedrate", offset: 18, dataType: "real", wordLength: 2 },
        {
          key: TAG_KEYS.trigger,
          description: "Move trigger",
          offset: 0,
          dataType: "bool",
          wordLength: 1,
          bitPosition: 0,
        },
      ];

      for (const t of seedTags) {
        if (existingKeys.has(t.key)) continue;
        await createTag({ ...t, dataSetId });
      }
    } catch (err) {
      console.warn("Seed skipped/failed", err);
    }
  };

  useEffect(() => {
    let fetchTimer: ReturnType<typeof setInterval> | null = null;
    let renderTimer: ReturnType<typeof setInterval> | null = null;
    let unmounted = false;

    if (RUN_SEED_ONCE) {
      seedPlcMetadata().catch((err) => console.warn("Seed error", err));
    }
    startTagPolling().catch((err) => console.warn("Failed to start tag polling", err));

    const pollOnce = async () => {
      const positionPromises = axes.map(async (axis) => {
        const key = TAG_KEYS.position[axis as keyof typeof TAG_KEYS.position];
        try {
          const res = await getTagValue(key);
          return { axis, value: res?.value ?? null };
        } catch {
          return { axis, value: null };
        }
      });

      const loadPromises = axes.map(async (axis) => {
        const key = TAG_KEYS.load[axis as keyof typeof TAG_KEYS.load];
        try {
          const res = await getTagValue(key);
          return { axis, value: res?.value ?? null };
        } catch {
          return { axis, value: null };
        }
      });

      const [positions, loads, feedVal, triggerVal] = await Promise.all([
        Promise.all(positionPromises),
        Promise.all(loadPromises),
        getTagValue(TAG_KEYS.feedrate).then((r) => r?.value ?? null).catch(() => null),
        getTagValue(TAG_KEYS.trigger).then((r) => r?.value ?? null).catch(() => null),
      ]);

      const next: Record<string, AxisState> = { ...latestAxisRef.current };

      positions.forEach(({ axis, value }) => {
        if (value === null || value === undefined) return;
        const num = Number(value);
        if (Number.isFinite(num)) {
          const prev = next[axis] ?? { pos: 0, load: 0, ref: false };
          next[axis] = { ...prev, pos: num };
        }
      });

      loads.forEach(({ axis, value }) => {
        if (value === null || value === undefined) return;
        const num = Number(value);
        if (Number.isFinite(num)) {
          const prev = next[axis] ?? { pos: 0, load: 0, ref: false };
          next[axis] = { ...prev, load: num };
        }
      });

      latestAxisRef.current = next;

      if (feedVal !== null && feedVal !== undefined) {
        const num = Number(feedVal);
        if (Number.isFinite(num)) {
          latestFeedrateRef.current = num;
        }
      }

      if (typeof triggerVal === "boolean") {
        setTriggerOn(triggerVal);
      } else if (triggerVal === 0 || triggerVal === 1) {
        setTriggerOn(triggerVal === 1);
      } else if (triggerVal === "0" || triggerVal === "1") {
        setTriggerOn(triggerVal === "1");
      } else if (triggerVal === "true" || triggerVal === "false") {
        setTriggerOn(triggerVal === "true");
      }
    };

    // @@@ : 즉시 한 번 폴링 후 주기
    pollOnce();
    fetchTimer = setInterval(pollOnce, 100); // 100ms fetch

    // @@@ 화면 업데이트 주기(ms) - 필요 시 숫자 변경
    renderTimer = setInterval(() => {
      if (unmounted) return;
      setAxisData((prev) => {
        const next: Record<string, AxisState> = { ...prev };
        axes.forEach((axis) => {
          const latest = latestAxisRef.current[axis];
          if (latest) {
            next[axis] = { ...next[axis], ...latest };
          }
        });
        return next;
      });
      setFeedrateValue(latestFeedrateRef.current);
    }, 100); // 200ms render

    return () => {
      unmounted = true;
      if (fetchTimer) clearInterval(fetchTimer);
      if (renderTimer) clearInterval(renderTimer);
      stopTagPolling().catch((err) => console.warn("Failed to stop tag polling", err));
    };
  }, [axes]);

  const handleToggleTrigger = async () => {
    const next = !triggerOn;
    try {
      await writeTagValue(TAG_KEYS.trigger, next);
      setTriggerOn(next);
    } catch (err) {
      console.error("Failed to toggle trigger", err);
    }
  };

  const grippers = useMemo(() => {
    const count = appliedHardware?.gantry?.gripperCount || fallbackHardware.gantry.gripperCount;

    return Array.from({ length: Math.max(0, count) }, (_, idx) => ({
      name: String.fromCharCode(65 + idx),
      state: idx % 2 === 0,
    }));
  }, [appliedHardware]);

  return (
    <div className="mainA-container">
      {/* LEFT */}
      <div className="mainA-left">
        {/* GANTRY BOX */}
        <div className="mainA-gantry-box">
          <h3>Gantry Status</h3>

          {/* Position */}
          <div className="sub-box">
            <div className="section-title">Position</div>

            {axes.map((axis) => (
              <div className="axis-row" key={axis}>
                <span className="axis-name">{axis}</span>

                <span className="axis-pos-box">
                  {axisData[axis].pos.toFixed(3)}
                </span>

                <span className={`axis-ref ${axisData[axis].ref ? "on" : ""}`}></span>
              </div>
            ))}
          </div>

          {/* Feedrate */}
          <div className="sub-box">
            <div className="section-title">Feedrate</div>
            <div className="feedrate-box">{feedrateValue} mm/min</div>
          </div>

          {/* Loadmeter */}
          <div className="sub-box">
            <div className="section-title">Loadmeter</div>

            {axes.map((axis) => (
              <div key={axis} className="loadmeter-block">
                <div className="loadmeter-label">{axis}</div>
                <div className="loadmeter-row">
                  <div className="loadmeter-bar">
                    <div
                      className={`loadmeter-fill ${
                        axisData[axis].load < 31
                          ? "low"
                          : axisData[axis].load < 70
                          ? "mid"
                          : "high"
                      }`}
                      style={{ width: `${axisData[axis].load}%` }}
                    ></div>
                  </div>

                  <span className="loadmeter-value">{axisData[axis].load}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GRIPPERS BOX */}
        <div className="mainA-gripper-box">
          <h3>Grippers Status</h3>
          <div className="sub-box">
            {grippers.map((g) => (
              <div key={g.name} className="gripper-row">
                <span className="gripper-name">{g.name}</span>
                <span className={g.state ? "status-green" : "status-red"}>{g.state ? "Clamp" : "Unclamp"}</span>
              </div>
            ))}
          </div>
          <div className="gripper-controls">
            <button className={`gripper-btn ${triggerOn ? "on" : ""}`} onClick={handleToggleTrigger} title="D0.0 Toggle">
              {triggerOn ? "D0.0 ON" : "D0.0 OFF"}
            </button>
            <button className="gripper-btn" disabled>
              -
            </button>
            <button className="gripper-btn" disabled>
              -
            </button>
            <button className="gripper-btn" disabled>
              -
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="mainA-right">
        <div className="mainA-right-panel">
          <div className="panel-buttons">
            <button className={`panel-btn ${panel === 1 ? "selected" : ""}`} onClick={() => setPanel(1)}>
              A
            </button>
            <button className={`panel-btn ${panel === 2 ? "selected" : ""}`} onClick={() => setPanel(2)}>
              B
            </button>
            <button className={`panel-btn ${panel === 3 ? "selected" : ""}`} onClick={() => setPanel(3)}>
              C
            </button>
          </div>

          <div className="panel-body">
            <div className="placeholder-text">Panel {panel}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
