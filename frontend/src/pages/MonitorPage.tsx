import React, { useState, useEffect, useCallback } from 'react';
import {
  getDataPoints,
  getPollingStatus,
  startPolling,
  stopPolling,
  setPollingInterval,
  readData,
  writeData,
  deleteDataPoint,
} from '../services/api';
import { DataPoint, PlcDataResponse, PollingStatus } from '../types';
import './MonitorPage.css';

const MonitorPage: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>({
    isPolling: false,
    intervalMs: 1000,
    registeredDataPoints: [],
  });
  const [dataCache, setDataCache] = useState<Record<string, PlcDataResponse>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load data points and polling status
  const loadData = useCallback(async () => {
    try {
      const [points, status] = await Promise.all([
        getDataPoints(),
        getPollingStatus(),
      ]);
      setDataPoints(points);
      setPollingStatus(status);
    } catch (error: any) {
      console.error('Failed to load data:', error);
    }
  }, []);

  // Load cached data
  const loadCachedData = useCallback(async () => {
    try {
      const cache: Record<string, PlcDataResponse> = {};
      for (const point of dataPoints) {
        try {
          const data = await readData(point.key);
          cache[point.key] = data;
        } catch (error) {
          // Skip if data not found
        }
      }
      setDataCache(cache);
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  }, [dataPoints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (dataPoints.length > 0) {
      loadCachedData();
    }
  }, [dataPoints, loadCachedData]);

  // Auto-refresh data when polling is active
  useEffect(() => {
    if (pollingStatus.isPolling) {
      const interval = setInterval(() => {
        loadCachedData();
      }, Math.max(pollingStatus.intervalMs, 1000));
      return () => clearInterval(interval);
    }
  }, [pollingStatus.isPolling, pollingStatus.intervalMs, loadCachedData]);

  const handleStartPolling = async () => {
    try {
      await startPolling();
      await loadData();
      setMessage({ type: 'success', text: 'Polling started' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to start polling' });
    }
  };

  const handleStopPolling = async () => {
    try {
      await stopPolling();
      await loadData();
      setMessage({ type: 'success', text: 'Polling stopped' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to stop polling' });
    }
  };

  const handleSetInterval = async (intervalMs: number) => {
    try {
      await setPollingInterval(intervalMs);
      await loadData();
      setMessage({ type: 'success', text: `Polling interval set to ${intervalMs}ms` });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to set polling interval' });
    }
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete "${key}"?`)) {
      return;
    }

    try {
      await deleteDataPoint(key);
      await loadData();
      setMessage({ type: 'success', text: `Data point "${key}" deleted` });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to delete data point' });
    }
  };

  const handleEdit = (point: DataPoint) => {
    setEditingKey(point.key);
    const cachedData = dataCache[point.key];
    if (cachedData) {
      if (point.type === 'bool') {
        setEditValue(String(cachedData.value));
      } else if (point.type === 'number') {
        setEditValue(Array.isArray(cachedData.value) ? cachedData.value.join(',') : '');
      } else {
        setEditValue(String(cachedData.value));
      }
    } else {
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSaveEdit = async (point: DataPoint) => {
    try {
      let value: number[] | string | boolean;

      if (point.type === 'number') {
        value = editValue.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
      } else if (point.type === 'bool') {
        value = editValue.toLowerCase() === 'true' || editValue === '1';
      } else {
        value = editValue;
      }

      await writeData(point.key, value);
      setMessage({ type: 'success', text: `Value written to "${point.key}"` });
      setEditingKey(null);
      setEditValue('');

      // Reload data immediately
      setTimeout(() => loadCachedData(), 500);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to write value'
      });
    }
  };

  const formatValue = (point: DataPoint, data: PlcDataResponse | undefined): string => {
    if (!data) return 'N/A';
    if (data.error) return `Error: ${data.error}`;

    if (point.type === 'bool') {
      return String(data.value);
    } else if (point.type === 'number') {
      return Array.isArray(data.value) ? data.value.join(', ') : String(data.value);
    } else {
      return String(data.value);
    }
  };

  const formatTimestamp = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="monitor-page">
      <h1>PLC Monitor & Control</h1>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="close-btn">×</button>
        </div>
      )}

      {/* Polling Controls */}
      <div className="polling-controls">
        <div className="status-info">
          <span className={`status-indicator ${pollingStatus.isPolling ? 'active' : 'inactive'}`}>
            {pollingStatus.isPolling ? '● Polling Active' : '○ Polling Inactive'}
          </span>
          <span>Interval: {pollingStatus.intervalMs}ms</span>
          <span>Data Points: {dataPoints.length}</span>
        </div>

        <div className="control-buttons">
          <button
            onClick={handleStartPolling}
            disabled={pollingStatus.isPolling}
            className="control-btn start-btn"
          >
            Start Polling
          </button>
          <button
            onClick={handleStopPolling}
            disabled={!pollingStatus.isPolling}
            className="control-btn stop-btn"
          >
            Stop Polling
          </button>
          <select
            onChange={(e) => handleSetInterval(parseInt(e.target.value))}
            value={pollingStatus.intervalMs}
            className="interval-select"
          >
            <option value={500}>500ms</option>
            <option value={1000}>1s</option>
            <option value={2000}>2s</option>
            <option value={5000}>5s</option>
          </select>
          <button onClick={loadCachedData} className="control-btn refresh-btn">
            Refresh Data
          </button>
        </div>
      </div>

      {/* Data Points Table */}
      <div className="data-table-container">
        {dataPoints.length === 0 ? (
          <div className="empty-state">
            No data points registered. Go to Register page to add data points.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Description</th>
                <th>Address</th>
                <th>Type</th>
                <th>Value</th>
                <th>Timestamp</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataPoints.map((point) => {
                const cachedData = dataCache[point.key];
                const isEditing = editingKey === point.key;

                return (
                  <tr key={point.key} className={cachedData?.error ? 'error-row' : ''}>
                    <td className="key-cell">{point.key}</td>
                    <td>{point.description}</td>
                    <td>
                      {point.addressType}{point.address}
                      {point.bit !== undefined && `.${point.bit}`}
                    </td>
                    <td>
                      <span className={`type-badge ${point.type}`}>
                        {point.type}
                      </span>
                    </td>
                    <td className="value-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="value-input"
                          placeholder={
                            point.type === 'number'
                              ? 'e.g., 100,200,300'
                              : point.type === 'bool'
                              ? 'true or false'
                              : 'Enter text'
                          }
                        />
                      ) : (
                        <span className="value-display">
                          {formatValue(point, cachedData)}
                        </span>
                      )}
                    </td>
                    <td className="timestamp-cell">
                      {formatTimestamp(cachedData?.timestamp)}
                    </td>
                    <td className="actions-cell">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(point)}
                            className="action-btn save-btn"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="action-btn cancel-btn"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(point)}
                            className="action-btn edit-btn"
                          >
                            Write
                          </button>
                          <button
                            onClick={() => handleDelete(point.key)}
                            className="action-btn delete-btn"
                          >
                            Delete
                          </button>
                        </>
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

export default MonitorPage;
