// src/pages/TagMonitorPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  getTags,
  getTagValue,
  writeTagValue,
  startTagPolling,
  stopTagPolling,
  getTagPollingStatus,
  getTagPollingMetrics,
} from "../services/tagApi";
import { Tag, TagValue, TagPollingStatus } from "../types";
import "./TagMonitorPage.css";

const TagMonitorPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagValues, setTagValues] = useState<Record<string, TagValue>>({});
  const [pollingStatus, setPollingStatus] = useState<TagPollingStatus>({
    isPolling: false,
    dataSetCount: 0,
    tagCount: 0,
  });
  const [metrics, setMetrics] = useState({ readCount: 0, readsPerSecond: 0, elapsedSeconds: 0 });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [frontendRefreshInterval, setFrontendRefreshInterval] = useState<number>(1000);

  const loadTags = useCallback(async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }, []);

  const loadTagValues = useCallback(async () => {
    const values: Record<string, TagValue> = {};
    for (const tag of tags) {
      try {
        const value = await getTagValue(tag.key);
        values[tag.key] = value;
      } catch {
        // Skip if not available
      }
    }
    setTagValues(values);
  }, [tags]);

  const loadStatus = useCallback(async () => {
    try {
      const status = await getTagPollingStatus();
      setPollingStatus(status);
    } catch (error) {
      console.error("Failed to load polling status:", error);
    }
  }, []);

  useEffect(() => {
    loadTags();
    loadStatus();
  }, [loadTags, loadStatus]);

  useEffect(() => {
    if (tags.length > 0) {
      loadTagValues();
    }
  }, [tags, loadTagValues]);

  // Auto-refresh when polling is active
  useEffect(() => {
    if (pollingStatus.isPolling) {
      const interval = setInterval(() => {
        loadTagValues();
      }, frontendRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [pollingStatus.isPolling, frontendRefreshInterval, loadTagValues]);

  // Metrics update
  useEffect(() => {
    if (pollingStatus.isPolling) {
      const interval = setInterval(async () => {
        try {
          const data = await getTagPollingMetrics();
          setMetrics(data);
        } catch (error) {
          console.error("Failed to get metrics:", error);
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      setMetrics({ readCount: 0, readsPerSecond: 0, elapsedSeconds: 0 });
    }
  }, [pollingStatus.isPolling]);

  const handleStartPolling = async () => {
    try {
      await startTagPolling();
      await loadStatus();
      setMessage({ type: "success", text: "Tag polling started" });
    } catch (error: any) {
      setMessage({ type: "error", text: "Failed to start polling" });
    }
  };

  const handleStopPolling = async () => {
    try {
      await stopTagPolling();
      await loadStatus();
      setMessage({ type: "success", text: "Tag polling stopped" });
    } catch (error: any) {
      setMessage({ type: "error", text: "Failed to stop polling" });
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingKey(tag.key);
    const cachedValue = tagValues[tag.key];
    if (cachedValue) {
      setEditValue(String(cachedValue.value));
    } else {
      setEditValue("");
    }
  };

  const handleSave = async (tag: Tag) => {
    try {
      let value: number | string | boolean;

      if (tag.dataType === "int16" || tag.dataType === "int32" || tag.dataType === "real") {
        value = parseFloat(editValue);
        if (isNaN(value)) {
          throw new Error("Invalid number");
        }
      } else if (tag.dataType === "bool") {
        value = editValue.toLowerCase() === "true" || editValue === "1";
      } else {
        value = editValue;
      }

      await writeTagValue(tag.key, value);
      setMessage({ type: "success", text: `Value written to '${tag.key}'` });
      setEditingKey(null);
      setEditValue("");

      // Reload after write
      setTimeout(() => loadTagValues(), 500);
    } catch (error: any) {
      console.error("Write error details:", error.response?.data);
      const data = error.response?.data;
      let errorMsg = "Failed to write value";

      if (data?.message) {
        // message가 배열인 경우
        if (Array.isArray(data.message)) {
          errorMsg = data.message.join(", ");
        } else {
          errorMsg = data.message;
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      console.error("Error message:", errorMsg);
      setMessage({ type: "error", text: errorMsg });
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const formatValue = (tag: Tag, value: TagValue | undefined): string => {
    if (!value) return "N/A";
    if (value.error) return `Error: ${value.error}`;

    if (tag.dataType === "real" && typeof value.value === "number") {
      return value.value.toFixed(2);
    }

    return String(value.value);
  };

  const formatTimestamp = (date: Date | undefined): string => {
    if (!date) return "N/A";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    const milliseconds = String(d.getMilliseconds()).padStart(3, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  return (
    <div className="page tag-monitor-page">
      <h1 className="page-title">Tag Monitor & Control</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close" aria-label="Close">
            ×
          </button>
        </div>
      )}

      {/* Polling Controls */}
      <div className="card polling-controls">
        <div className="status-info">
          <span className={`status-indicator ${pollingStatus.isPolling ? "active" : "inactive"}`}>
            {pollingStatus.isPolling ? "● Polling Active" : "○ Polling Inactive"}
          </span>
          <span className="status-subtext">
            DataSets: {pollingStatus.dataSetCount}, Tags: {pollingStatus.tagCount}
          </span>
          {pollingStatus.isPolling && (
            <>
              <span className="metrics-divider">|</span>
              <span className="metrics-item">{metrics.readCount} reads</span>
              <span className="metrics-item">{metrics.readsPerSecond} reads/sec</span>
              <span className="metrics-item">{metrics.elapsedSeconds}s elapsed</span>
            </>
          )}
        </div>

        <div className="control-buttons">
          <label className="control-label">UI Refresh</label>
          <select
            onChange={(e) => setFrontendRefreshInterval(parseInt(e.target.value, 10))}
            value={frontendRefreshInterval}
            className="form-select interval-select"
          >
            <option value={100}>100ms</option>
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
          </select>
          <button onClick={handleStartPolling} disabled={pollingStatus.isPolling} className="btn btn-success">
            Start
          </button>
          <button onClick={handleStopPolling} disabled={!pollingStatus.isPolling} className="btn btn-danger">
            Stop
          </button>
          <button onClick={loadTagValues} className="btn btn-neutral">
            Refresh
          </button>
        </div>
      </div>

      {/* Tag Values Table */}
      <div className="card">
        <h2>Tag Values ({tags.length})</h2>
        {tags.length === 0 ? (
          <div className="empty-state">No tags registered. Go to Tag page to create tags.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Description</th>
                <th>Type</th>
                <th>Value</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => {
                const value = tagValues[tag.key];
                const isEditing = editingKey === tag.key;

                return (
                  <tr key={tag.key} className={value?.error ? "error-row" : ""}>
                    <td className="key-cell">{tag.key}</td>
                    <td>{tag.description}</td>
                    <td>
                      <span className={`badge badge-${tag.dataType}`}>{tag.dataType}</span>
                    </td>
                    <td className="value-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="value-input"
                          placeholder={tag.dataType === "bool" ? "true or false" : "Enter value"}
                        />
                      ) : (
                        <span className="value-display">{formatValue(tag, value)}</span>
                      )}
                    </td>
                    <td className="timestamp-cell">{formatTimestamp(value?.timestamp)}</td>
                    <td className="actions-cell">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(tag)} className="btn btn-success btn-small">
                            Save
                          </button>
                          <button onClick={handleCancel} className="btn btn-neutral btn-small">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleEdit(tag)} className="btn btn-primary btn-small">
                          Write
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TagMonitorPage;
