import React, { useMemo, useState } from "react";
import "./DiagnosisPage.css";

type LinkStatus = {
  name: string;
  status: "OK" | "DEGRADED" | "DOWN";
  latencyMs: number;
  loss: string;
  detail: string;
};

type Alarm = {
  system: "Gantry" | "CNC" | "Stocker" | "Turnover" | "Buffer" | "IPC";
  severity: "High" | "Medium" | "Low";
  title: string;
  time: string;
  hint?: string;
};

const linkStatuses: LinkStatus[] = [
  { name: "IPC <-> PLC", status: "OK", latencyMs: 12, loss: "0.1%", detail: "Cyclic read/write stable" },
  { name: "IPC <-> CNC", status: "DEGRADED", latencyMs: 35, loss: "0.8%", detail: "Door/servo signals slow" },
];

const alarms: Alarm[] = [
  { system: "Gantry", severity: "High", title: "Robot I/F communication lost", time: "11:12:04", hint: "Check cable / reset gateway" },
  { system: "CNC", severity: "Medium", title: "Cycle time +18% vs baseline", time: "11:04:22", hint: "Inspect tool wear" },
  { system: "Stocker", severity: "Low", title: "Buffer approaching limit", time: "10:55:01", hint: "Schedule unload" },
  { system: "Turnover", severity: "Low", title: "Mode sensor unstable", time: "10:44:10" },
  { system: "Buffer", severity: "Low", title: "Sensor debounce detected", time: "10:41:33" },
  { system: "IPC", severity: "Medium", title: "Disk usage high (82%)", time: "10:40:18" },
];

const tabs = [
  { key: "connections", label: "Connections", desc: "IPC & PLC link health" },
  { key: "alarms", label: "Alarms", desc: "Equipment alarm center" },
] as const;

type TabKey = (typeof tabs)[number]["key"];
type AlarmFilter = "All" | "Gantry" | "CNC" | "Stocker" | "Turnover" | "Buffer" | "IPC";

const DiagnosisPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("connections");
  const [alarmFilter, setAlarmFilter] = useState<AlarmFilter>("All");
  // 한국어 주석: 페이지 진입 시점의 스냅샷 시간을 기억
  const timestamp = useMemo(() => new Date().toLocaleString(), []);
  const filteredAlarms = alarms.filter((a) => alarmFilter === "All" || a.system === alarmFilter);

  return (
    <div className="diagnosis-page">
      <div className="diag-header">
        <div>
          <h1>Diagnosis</h1>
          <p className="diag-sub">Inspect communication, alarms, and data map in one place.</p>
        </div>
        <div className="diag-meta">
          <span className="diag-chip">Live snapshot</span>
          <span className="diag-meta-text">Last updated: {timestamp}</span>
        </div>
      </div>

      <div className="diag-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`diag-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <div className="tab-label">{t.label}</div>
            <div className="tab-desc">{t.desc}</div>
          </button>
        ))}
      </div>

      {tab === "connections" && (
        <div className="tab-panel">
          <div className="diag-card">
            <div className="card-header">
              <div>
                <div className="card-title">IPC / PLC Link</div>
                <div className="card-desc">Latency, packet loss, and remarks</div>
              </div>
            </div>
            <div className="card-body connection-list">
              {linkStatuses.map((c) => (
                <div key={c.name} className="connection-row">
                  <div className={`dot ${c.status.toLowerCase()}`} />
                  <div className="connection-name">
                    <div className="connection-title">{c.name}</div>
                    <div className="connection-detail">{c.detail}</div>
                  </div>
                  <div className="connection-latency">{c.latencyMs} ms</div>
                  <div className="connection-loss">{c.loss} loss</div>
                  <span className={`connection-badge ${c.status.toLowerCase()}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="diag-card logs-card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Link Logs</div>
                <div className="card-desc">Heartbeat and retry attempts</div>
              </div>
            </div>
            <div className="card-body log-list">
              {[
                "[11:12:04] Robot I/F reconnect attempt failed (timeout)",
                "[11:11:48] PLC heartbeat OK (14 ms)",
                "[11:10:03] CNC axis Z load spike detected (65%)",
                "[11:08:44] Cycle time deviation +18%",
                "[11:05:10] Buffer level at 78%",
              ].map((line, idx) => (
                <div key={idx} className="log-line">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "alarms" && (
        <div className="tab-panel">
          <div className="diag-card">
            <div className="card-header">
              <div>
                <div className="card-title">Alarm Center</div>
                <div className="card-desc">Gantry, CNC, stocker, turnover, buffer</div>
              </div>
              <div className="alarm-filters">
                {(["All", "Gantry", "CNC", "Stocker", "Turnover", "Buffer", "IPC"] as AlarmFilter[]).map(
                  (f) => (
                    <button
                      key={f}
                      className={`alarm-filter ${alarmFilter === f ? "active" : ""}`}
                      onClick={() => setAlarmFilter(f)}
                    >
                      {f}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="card-body alarm-list">
              {filteredAlarms.map((a, idx) => (
                <div key={idx} className="alarm-row">
                  <span className={`alarm-pill ${a.severity.toLowerCase()}`}>{a.severity}</span>
                  <div className="alarm-main">
                    <div className="alarm-title">
                      [{a.system}] {a.title}
                    </div>
                    <div className="alarm-time">{a.time}</div>
                  </div>
                  {a.hint && <div className="alarm-hint">{a.hint}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DiagnosisPage;
