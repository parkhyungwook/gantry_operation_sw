// src/pages/DataSetPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { getDataSets, createDataSet, updateDataSet, deleteDataSet } from "../services/tagApi";
import { DataSet } from "../types";
import "./DataSetPage.css";

const DataSetPage: React.FC = () => {
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<DataSet>>({
    name: "",
    addressType: "D",
    startAddress: 1000,
    length: 100,
    pollingInterval: 100,
    enabled: true,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadDataSets = useCallback(async () => {
    try {
      const data = await getDataSets();
      setDataSets(data);
    } catch (error) {
      console.error("Failed to load DataSets:", error);
    }
  }, []);

  useEffect(() => {
    loadDataSets();
  }, [loadDataSets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      setMessage({ type: "error", text: "Name is required" });
      return;
    }

    try {
      if (editingId) {
        // Update
        await updateDataSet(editingId, formData);
        setMessage({ type: "success", text: `DataSet updated` });
      } else {
        // Create
        await createDataSet(formData as Omit<DataSet, "id">);
        setMessage({ type: "success", text: `DataSet created` });
      }

      setFormData({
        name: "",
        addressType: "D",
        startAddress: 1000,
        length: 100,
        pollingInterval: 100,
        enabled: true,
      });
      setEditingId(null);
      await loadDataSets();
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.message || "Failed to save DataSet" });
    }
  };

  const handleEdit = (dataSet: DataSet) => {
    setEditingId(dataSet.id);
    setFormData({
      name: dataSet.name,
      pollingInterval: dataSet.pollingInterval,
      enabled: dataSet.enabled,
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this DataSet?")) {
      return;
    }

    try {
      await deleteDataSet(id);
      setMessage({ type: "success", text: "DataSet deleted" });
      await loadDataSets();
    } catch (error: any) {
      setMessage({ type: "error", text: "Failed to delete DataSet" });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: "",
      addressType: "D",
      startAddress: 1000,
      length: 100,
      pollingInterval: 100,
      enabled: true,
    });
  };

  return (
    <div className="page dataset-page">
      <h1 className="page-title">DataSet 관리</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="alert-close" aria-label="Close">
            ×
          </button>
        </div>
      )}

      {/* Form */}
      <div className="card">
        <h2>{editingId ? "DataSet 수정" : "DataSet 등록"}</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          {!editingId && (
            <>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input"
                    placeholder="예: 고속 센서 데이터"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Address Type</label>
                  <select
                    value={formData.addressType || "D"}
                    onChange={(e) => setFormData({ ...formData, addressType: e.target.value as any })}
                    className="form-select"
                  >
                    <option value="D">D (Data Register)</option>
                    <option value="R">R (File Register)</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Start Address</label>
                  <input
                    type="number"
                    value={formData.startAddress || 0}
                    onChange={(e) => setFormData({ ...formData, startAddress: parseInt(e.target.value) })}
                    className="form-input"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Length (words)</label>
                  <input
                    type="number"
                    value={formData.length || 1}
                    onChange={(e) => setFormData({ ...formData, length: parseInt(e.target.value) })}
                    className="form-input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Polling Interval (ms)</label>
              <input
                type="number"
                value={formData.pollingInterval || 100}
                onChange={(e) => setFormData({ ...formData, pollingInterval: parseInt(e.target.value) })}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Enabled</label>
              <select
                value={formData.enabled ? "true" : "false"}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.value === "true" })}
                className="form-select"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="form-row" style={{ gap: "8px" }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? "Update" : "Create"}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancel} className="btn btn-neutral">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* DataSet List */}
      <div className="card">
        <h2>등록된 DataSet ({dataSets.length})</h2>
        {dataSets.length === 0 ? (
          <div className="empty-state">No DataSets registered.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Address Range</th>
                <th>Length</th>
                <th>Polling (ms)</th>
                <th>Enabled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataSets.map((ds) => (
                <tr key={ds.id}>
                  <td>{ds.id}</td>
                  <td className="key-cell">{ds.name}</td>
                  <td>
                    {ds.addressType}
                    {ds.startAddress} ~ {ds.addressType}
                    {ds.startAddress + ds.length - 1}
                  </td>
                  <td>{ds.length}</td>
                  <td>{ds.pollingInterval}</td>
                  <td>
                    <span className={`badge ${ds.enabled ? "badge-enabled" : "badge-disabled"}`}>
                      {ds.enabled ? "YES" : "NO"}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button onClick={() => handleEdit(ds)} className="btn btn-primary btn-small">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(ds.id)} className="btn btn-danger btn-small">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DataSetPage;
