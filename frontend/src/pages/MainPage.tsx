import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";
const TAG_KEYS = {
  position: { X: "x_position", Y: "y_position", Z: "z_position", C: "c_position" },
  load: { X: "x_load", Y: "y_load", Z: "z_load", C: "c_load" },
  feedrate: "feedrate",
  trigger: "move_trigger", // D0.0 토글용 Tag key (bool/bit 태그에 맞게 조정)
};

const axisOrder = ["X", "Y", "Z", "C", "B", "A"];

const MainPage: React.FC = () => {
  const [panel, setPanel] = useState<number>(1);
  const [appliedHardware, setAppliedHardware] =
    useState<AppliedHardware | null>(null);
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
      const fallback =
        fallbackAxisData[axis] ?? fallbackList[index] ?? defaultState;
      acc[axis] = fallback;
      return acc;
    }, {} as Record<string, AxisState>);
    setAxisData(next);
    latestAxisRef.current = next;
  }, [axes]);

  const startTagPolling = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/plc/tags/polling/start`, { method: "POST" });
    } catch (err) {
      console.warn("Failed to start tag polling", err);
    }
  }, []);

  const fetchTagValue = useCallback(async (key: string): Promise<number | boolean | string | null> => {
    if (!key) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/plc/tags/${key}/value`);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.value ?? null;
    } catch (err) {
      console.warn(`Failed to fetch tag ${key}`, err);
      return null;
    }
  }, []);

  useEffect(() => {
    let fetchTimer: ReturnType<typeof setInterval> | null = null;
    let renderTimer: ReturnType<typeof setInterval> | null = null;
    let unmounted = false;

    startTagPolling();

    const pollOnce = async () => {
      const positionPromises = axes.map(async (axis) => {
        const key = TAG_KEYS.position[axis as keyof typeof TAG_KEYS.position];
        const value = await fetchTagValue(key);
        return { axis, value };
      });

      const loadPromises = axes.map(async (axis) => {
        const key = TAG_KEYS.load[axis as keyof typeof TAG_KEYS.load];
        const value = await fetchTagValue(key);
        return { axis, value };
      });

      const [positions, loads, feedVal, triggerVal] = await Promise.all([
        Promise.all(positionPromises),
        Promise.all(loadPromises),
        fetchTagValue(TAG_KEYS.feedrate),
        fetchTagValue(TAG_KEYS.trigger),
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
      }
    };

    // immediate first poll so UI updates without waiting
    pollOnce();
    fetchTimer = setInterval(pollOnce, 100); // 100ms fetch

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
    }, 200); // 200ms render

    return () => {
      unmounted = true;
      if (fetchTimer) clearInterval(fetchTimer);
      if (renderTimer) clearInterval(renderTimer);
    };
  }, [axes, fetchTagValue, startTagPolling]);

  const handleToggleTrigger = async () => {
    const next = !triggerOn;
    try {
      await fetch(`${API_BASE_URL}/plc/tags/${TAG_KEYS.trigger}/value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: next }),
      });
      setTriggerOn(next);
    } catch (err) {
      console.error("Failed to toggle trigger", err);
    }
  };

  const grippers = useMemo(
    () => {
      const count =
        appliedHardware?.gantry?.gripperCount ||
        fallbackHardware.gantry.gripperCount;

      return Array.from({ length: Math.max(0, count) }, (_, idx) => ({
        name: String.fromCharCode(65 + idx),
        state: idx % 2 === 0,
      }));
    },
    [appliedHardware]
  );

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

                <span
                  className={`axis-ref ${axisData[axis].ref ? "on" : ""}`}
                ></span>
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
                      className="loadmeter-fill"
                      style={{ width: `${axisData[axis].load}%` }}
                    ></div>
                  </div>

                  <span className="loadmeter-value">
                    {axisData[axis].load}%
                  </span>
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
                <span className={g.state ? "status-green" : "status-red"}>
                  {g.state ? "Clamp" : "Unclamp"}
                </span>
              </div>
            ))}
          </div>
          <div className="gripper-controls">
            <button
              className={`gripper-btn ${triggerOn ? "on" : ""}`}
              onClick={handleToggleTrigger}
              title="D0.0 Toggle"
            >
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
            <button
              className={`panel-btn ${panel === 1 ? "selected" : ""}`}
              onClick={() => setPanel(1)}
            >
              A
            </button>
            <button
              className={`panel-btn ${panel === 2 ? "selected" : ""}`}
              onClick={() => setPanel(2)}
            >
              B
            </button>
            <button
              className={`panel-btn ${panel === 3 ? "selected" : ""}`}
              onClick={() => setPanel(3)}
            >
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
