import React, { useEffect, useMemo, useState } from "react";
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
    axes: 4,
    gripperCount: 2,
    gripperType: "",
  },
};

const fallbackAxisData: Record<string, AxisState> = {
  X: { pos: 123.456, ref: true, load: 40 },
  Y: { pos: 50.123, ref: false, load: 70 },
  Z: { pos: -10.555, ref: true, load: 20 },
  C: { pos: 5.0, ref: false, load: 55 },
};

const axisOrder = ["X", "Y", "Z", "C", "B", "A"];

const MainPage: React.FC = () => {
  const [panel, setPanel] = useState<number>(1);
  const [appliedHardware, setAppliedHardware] =
    useState<AppliedHardware | null>(null);

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

  const axisData = useMemo<Record<string, AxisState>>(() => {
    const defaultState: AxisState = { pos: 0, ref: false, load: 0 };
    const fallbackList = Object.values(fallbackAxisData);

    return axes.reduce((acc, axis, index) => {
      const fallback =
        fallbackAxisData[axis] ?? fallbackList[index] ?? defaultState;
      acc[axis] = fallback;
      return acc;
    }, {} as Record<string, AxisState>);
  }, [axes]);

  const feedrate = 1200;

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
            <div className="feedrate-box">{feedrate} mm/min</div>
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
