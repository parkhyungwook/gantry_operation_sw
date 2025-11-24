// src/pages/TagPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { getTags, createTag, deleteTag, getDataSets } from "../services/tagApi";
import { Tag, DataSet } from "../types";
import "./TagPage.css";

const TagPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [formData, setFormData] = useState<Partial<Tag>>({
    key: "",
    description: "",
    dataSetId: 0,
    offset: 0,
    dataType: "int16",
    wordLength: 1,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTags = useCallback(async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (error) {
      console.error("Failed to load Tags:", error);
    }
  }, []);

  const loadDataSets = useCallback(async () => {
    try {
      const data = await getDataSets();
      setDataSets(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, dataSetId: data[0].id }));
      }
    } catch (error) {
      console.error("Failed to load DataSets:", error);
    }
  }, []);

  useEffect(() => {
    loadDataSets();
    loadTags();
  }, [loadDataSets, loadTags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.key || !formData.description) {
      setMessage({ type: "error", text: "Key and description are required" });
      return;
    }

    try {
      // wordLength와 bitPosition을 타입에 따라 제거
      const payload: any = {
        key: formData.key,
        description: formData.description,
        dataSetId: formData.dataSetId,
        offset: formData.offset,
        dataType: formData.dataType,
      };

      // string 타입일 때만 wordLength 포함
      if (formData.dataType === "string") {
        payload.wordLength = formData.wordLength;
      }

      // bool 타입일 때만 bitPosition 포함
      if (formData.dataType === "bool") {
        payload.bitPosition = formData.bitPosition;
      }

      await createTag(payload);
      setMessage({ type: "success", text: `Tag '${formData.key}' created` });

      setFormData({
        key: "",
        description: "",
        dataSetId: dataSets[0]?.id || 0,
        offset: 0,
        dataType: "int16",
        wordLength: 1,
      });
      await loadTags();
    } catch (error: any) {
      setMessage({ type: "error", text: error.response?.data?.message || "Failed to create Tag" });
    }
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Are you sure you want to delete tag '${key}'?`)) {
      return;
    }

    try {
      await deleteTag(key);
      setMessage({ type: "success", text: `Tag '${key}' deleted` });
      await loadTags();
    } catch (error: any) {
      setMessage({ type: "error", text: "Failed to delete Tag" });
    }
  };

  const handleDataTypeChange = (dataType: string) => {
    let wordLength = 1;
    if (dataType === "int32" || dataType === "real") {
      wordLength = 2;
    } else if (dataType === "string") {
      wordLength = 5; // 10글자 기본
    }

    setFormData({ ...formData, dataType: dataType as any, wordLength });
  };

  const getDataSetName = (dataSetId: number): string => {
    const ds = dataSets.find((d) => d.id === dataSetId);
    return ds ? ds.name : `DataSet ${dataSetId}`;
  };

  return (
    <div className="page tag-page">
      <h1 className="page-title">Tag 정의 관리</h1>

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
        <h2>Tag 등록</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Key (고유 이름) *</label>
              <input
                type="text"
                value={formData.key || ""}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="form-input"
                placeholder="예: x_servo_position"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Description *</label>
              <input
                type="text"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                placeholder="예: X축 서보 위치"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">DataSet</label>
              <select
                value={formData.dataSetId || 0}
                onChange={(e) => setFormData({ ...formData, dataSetId: parseInt(e.target.value) })}
                className="form-select"
              >
                {dataSets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.addressType}
                    {ds.startAddress}~{ds.startAddress + ds.length - 1})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Offset (워드 단위)</label>
              <input
                type="number"
                value={formData.offset || 0}
                onChange={(e) => setFormData({ ...formData, offset: parseInt(e.target.value) })}
                className="form-input"
                min={0}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Data Type</label>
              <select
                value={formData.dataType || "int16"}
                onChange={(e) => handleDataTypeChange(e.target.value)}
                className="form-select"
              >
                <option value="int16">int16 (1워드)</option>
                <option value="int32">int32 (2워드)</option>
                <option value="real">real (2워드, float)</option>
                <option value="string">string</option>
                <option value="bool">bool (비트)</option>
              </select>
            </div>

            {formData.dataType === "string" && (
              <div className="form-field">
                <label className="form-label">Word Length (1워드 = 2글자)</label>
                <input
                  type="number"
                  value={formData.wordLength || 1}
                  onChange={(e) => setFormData({ ...formData, wordLength: parseInt(e.target.value) })}
                  className="form-input"
                  min={1}
                  max={10}
                />
                <small className="form-help">{(formData.wordLength || 1) * 2}글자까지</small>
              </div>
            )}

            {formData.dataType === "bool" && (
              <div className="form-field">
                <label className="form-label">Bit Position (0-15)</label>
                <input
                  type="number"
                  value={formData.bitPosition || 0}
                  onChange={(e) => setFormData({ ...formData, bitPosition: parseInt(e.target.value) })}
                  className="form-input"
                  min={0}
                  max={15}
                />
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary">
            Create Tag
          </button>
        </form>
      </div>

      {/* Tag List */}
      <div className="card">
        <h2>등록된 Tag ({tags.length})</h2>
        {tags.length === 0 ? (
          <div className="empty-state">No Tags registered. Create DataSet first, then create Tags.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Description</th>
                <th>DataSet</th>
                <th>Offset</th>
                <th>Type</th>
                <th>Length</th>
                <th>Bit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.key}>
                  <td className="key-cell">{tag.key}</td>
                  <td>{tag.description}</td>
                  <td>{getDataSetName(tag.dataSetId)}</td>
                  <td>+{tag.offset}</td>
                  <td>
                    <span className={`badge badge-${tag.dataType}`}>{tag.dataType}</span>
                  </td>
                  <td>{tag.wordLength}</td>
                  <td>{tag.bitPosition !== undefined ? tag.bitPosition : "-"}</td>
                  <td className="actions-cell">
                    <button onClick={() => handleDelete(tag.key)} className="btn btn-danger btn-small">
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

export default TagPage;
