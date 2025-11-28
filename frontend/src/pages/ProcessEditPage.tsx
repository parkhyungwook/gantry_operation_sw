// src/pages/ProcessEditPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CustomModal from "../components/CustomModal";
import "./ProcessAddPage.css";

type FunctionGroup = "Gantry" | "Machine" | "Stocker" | "Turnover" | "Buffer" | "Etc";

type PaletteItem = {
  id: string;
  name: string;
  group: FunctionGroup;
  description?: string;
};

type StepConfig = {
  param1?: string;
  param2?: string;
  comment?: string;
};

type Step = {
  id: string;
  templateId: string;
  name: string;
  group: FunctionGroup;
  config: StepConfig;
};

type ProcessInfo = {
  name: string;
  description: string;
  hardwareId?: string;
};

type ProcessEditLocationState = {
  process?: {
    id?: number;
    name?: string;
    description?: string;
    steps?: Step[];
  };
};

const paletteGroups: { group: FunctionGroup; title: string; items: PaletteItem[] }[] = [
  {
    group: "Gantry",
    title: "Gantry Loader Functions",
    items: [
      { id: "gantry-pick", name: "Pick from Machine", group: "Gantry" },
      { id: "gantry-place", name: "Place to Machine", group: "Gantry" },
      { id: "gantry-home", name: "Move Home", group: "Gantry" },
    ],
  },
  {
    group: "Machine",
    title: "Machine Functions",
    items: [
      { id: "machine-start", name: "Start Cycle", group: "Machine" },
      { id: "machine-door", name: "Open/Close Door", group: "Machine" },
    ],
  },
  {
    group: "Stocker",
    title: "Stocker Functions",
    items: [
      { id: "stocker-in", name: "Load Stocker", group: "Stocker" },
      { id: "stocker-out", name: "Unload Stocker", group: "Stocker" },
    ],
  },
  {
    group: "Turnover",
    title: "Turnover Functions",
    items: [
      { id: "turnover-a", name: "Flip A Mode", group: "Turnover" },
      { id: "turnover-b", name: "Flip B Mode", group: "Turnover" },
    ],
  },
  {
    group: "Buffer",
    title: "Buffer Functions",
    items: [
      { id: "buffer-load", name: "Load Buffer", group: "Buffer" },
      { id: "buffer-unload", name: "Unload Buffer", group: "Buffer" },
    ],
  },
  {
    group: "Etc",
    title: "Etc Functions",
    items: [
      { id: "delay", name: "Delay", group: "Etc" },
      { id: "comment", name: "Comment", group: "Etc" },
    ],
  },
];

const createFallbackSteps = (): Step[] => [
  {
    id: "step-1",
    templateId: "gantry-pick",
    name: "Pick from Machine",
    group: "Gantry",
    config: { param1: "Machine A", param2: "Slot 1", comment: "Initial pick" },
  },
  {
    id: "step-2",
    templateId: "machine-start",
    name: "Start Cycle",
    group: "Machine",
    config: { param1: "Cycle A", param2: "Program 01", comment: "" },
  },
  {
    id: "step-3",
    templateId: "gantry-place",
    name: "Place to Machine",
    group: "Gantry",
    config: { param1: "Machine B", param2: "Slot 2", comment: "Transfer" },
  },
];

const getNextStepCounter = (list: Step[]) => {
  const maxId = list.reduce((max, step) => {
    const numeric = parseInt(step.id.replace(/\D+/g, ""), 10);
    if (Number.isNaN(numeric)) return max;
    return numeric > max ? numeric : max;
  }, 0);
  return maxId + 1;
};

const ProcessEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const editState = location.state as ProcessEditLocationState | null;
  const processFromState = editState?.process;

  const initialSetup = useMemo(() => {
    const baseSteps = processFromState?.steps && processFromState.steps.length > 0 ? processFromState.steps : createFallbackSteps();
    const normalizedSteps = baseSteps.map((step, index) => ({
      ...step,
      id: step.id || `step-${index + 1}`,
      config: { ...(step.config || {}) },
    }));

    return {
      info: {
        name: processFromState?.name || (id ? `Process ${id}` : "Selected Process"),
        description: processFromState?.description || "Edit the saved process definition.",
        hardwareId: processFromState?.hardware?.id || "",
      },
      steps: normalizedSteps,
      nextId: getNextStepCounter(normalizedSteps),
      selectedId: normalizedSteps[0]?.id || null,
    };
  }, [id, processFromState]);

  const [processInfo, setProcessInfo] = useState<ProcessInfo>(initialSetup.info);
  const [isProcessDetailOpen, setProcessDetailOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<FunctionGroup, boolean>>({
    Gantry: true,
    Machine: true,
    Stocker: false,
    Turnover: false,
    Buffer: false,
    Etc: false,
  });
  const [steps, setSteps] = useState<Step[]>(initialSetup.steps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(initialSetup.selectedId);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [stepIdCounter, setStepIdCounter] = useState<number>(initialSetup.nextId);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);

  useEffect(() => {
    setProcessInfo(initialSetup.info);
    setSteps(initialSetup.steps);
    setStepIdCounter(initialSetup.nextId);
    setSelectedStepId(initialSetup.selectedId);
  }, [initialSetup]);

  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;
  const selectedIndex = selectedStep ? steps.findIndex((s) => s.id === selectedStep.id) : -1;

  const toggleGroup = (group: FunctionGroup) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const findPaletteItem = (templateId: string): PaletteItem | undefined => {
    for (const g of paletteGroups) {
      const found = g.items.find((i) => i.id === templateId);
      if (found) return found;
    }
    return undefined;
  };

  const handlePaletteDragStart = (e: React.DragEvent<HTMLDivElement>, item: PaletteItem) => {
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("app/type", "palette");
    e.dataTransfer.setData("app/paletteId", item.id);
  };

  const handleFlowStepDragStart = (e: React.DragEvent<HTMLDivElement>, stepId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("app/type", "flow");
    e.dataTransfer.setData("app/stepId", stepId);
  };

  const handleFlowDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSlotDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleFlowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("app/type");

    let targetIndex = dragOverIndex !== null ? dragOverIndex : steps.length;

    if (type === "palette") {
      const paletteId = e.dataTransfer.getData("app/paletteId");
      const template = findPaletteItem(paletteId);
      if (!template) {
        setDragOverIndex(null);
        return;
      }

      const newId = `step-${stepIdCounter}`;
      setStepIdCounter((prev) => prev + 1);

      const newStep: Step = {
        id: newId,
        templateId: template.id,
        name: template.name,
        group: template.group,
        config: {},
      };

      setSteps((prev) => {
        const arr = [...prev];
        arr.splice(targetIndex, 0, newStep);
        return arr;
      });

      setSelectedStepId(newId);
    } else if (type === "flow") {
      const stepId = e.dataTransfer.getData("app/stepId");
      setSteps((prev) => {
        const fromIndex = prev.findIndex((s) => s.id === stepId);
        if (fromIndex === -1) return prev.slice();

        const arr = [...prev];
        const [moved] = arr.splice(fromIndex, 1);

        if (targetIndex > fromIndex) {
          targetIndex -= 1;
        }

        arr.splice(targetIndex, 0, moved);
        return arr;
      });
    }

    setDragOverIndex(null);
  };

  const handleFlowDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleFlowDragEnd = () => {
    setDragOverIndex(null);
  };

  const updateSelectedStepConfig = (patch: Partial<StepConfig>) => {
    if (!selectedStep) return;
    setSteps((prev) =>
      prev.map((s) => (s.id === selectedStep.id ? { ...s, config: { ...s.config, ...patch } } : s))
    );
  };

  const handleDeleteStep = () => {
    if (!selectedStep) return;
    setSteps((prev) => {
      const targetIndex = prev.findIndex((s) => s.id === selectedStep.id);
      const filtered = prev.filter((s) => s.id !== selectedStep.id);
      const fallback = filtered[targetIndex] || filtered[targetIndex - 1] || null;
      setSelectedStepId(fallback ? fallback.id : null);
      return filtered;
    });
  };

  const handleApplyConfirm = () => {
    setApplyModalOpen(false);
  };

  const handleUpdateConfirm = () => {
    setUpdateModalOpen(false);
    navigate("/process");
  };

  return (
    <div className="process-page">
      <div className="process-topbar">
        <button className="process-detail-toggle" onClick={() => setProcessDetailOpen(true)}>
          Process Detail
        </button>

        <button className="process-save-icon-btn" onClick={() => setUpdateModalOpen(true)}>
          수정 완료
        </button>
      </div>

      <div className="process-main">
        <div className="joblist-container">
          <h2>Job List</h2>

          {paletteGroups.map(({ group, title, items }) => {
            const isOpen = openGroups[group];
            return (
              <div key={group} className="joblist-group">
                <div className="joblist-group-header" onClick={() => toggleGroup(group)}>
                  <span>{title}</span>
                  <span>{isOpen ? "-" : "+"}</span>
                </div>

                {isOpen && (
                  <div className="joblist-items">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="joblist-item"
                        draggable
                        onDragStart={(e) => handlePaletteDragStart(e, item)}
                      >
                        {item.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flow-container">
          <h2>Process Flow</h2>

          <div className="flow-scroll" onDragOver={handleFlowDragOver} onDrop={handleFlowDrop} onDragLeave={handleFlowDragLeave}>
            {steps.length === 0 && <div className="flow-placeholder">Drag &amp; Drop from Job List</div>}

            {steps.length > 0 && (
              <>
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flow-drop-slot" onDragOver={(e) => handleSlotDragOver(e, index)}>
                      {dragOverIndex === index && <div className="flow-placeholder-slot">Drop here</div>}
                    </div>

                    <div
                      className={"flow-step" + (step.id === selectedStepId ? " selected" : "")}
                      draggable
                      onDragStart={(e) => handleFlowStepDragStart(e, step.id)}
                      onDragEnd={handleFlowDragEnd}
                      onClick={() => setSelectedStepId(step.id)}
                    >
                      <div className="flow-step-label">
                        <span className="flow-step-name">
                          Step {index + 1} - {step.name}
                        </span>
                        <span className="flow-step-group">{step.group} Function</span>
                      </div>
                    </div>
                  </React.Fragment>
                ))}

                <div className="flow-drop-slot" onDragOver={(e) => handleSlotDragOver(e, steps.length)}>
                  {dragOverIndex === steps.length && <div className="flow-placeholder-slot">Drop here</div>}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="config-container">
          <div className="config-header">
            <h2>Step Detail{selectedStep && selectedIndex >= 0 ? ` (Step ${selectedIndex + 1})` : ""}</h2>

            {selectedStep && (
              <button className="delete-step-btn" onClick={handleDeleteStep}>
                Delete Step
              </button>
            )}
          </div>

          <div className="config-body">
            {!selectedStep && <div className="config-placeholder">Select a step in Process Flow.</div>}

            {selectedStep && (
              <div className="config-box">
                <p>
                  <strong>Function:</strong> {selectedStep.name}
                </p>
                <p>
                  <strong>Group:</strong> {selectedStep.group}
                </p>

                <label className="label">Parameter 1</label>
                <input
                  className="input"
                  value={selectedStep.config.param1 || ""}
                  onChange={(e) =>
                    updateSelectedStepConfig({
                      param1: e.target.value,
                    })
                  }
                />

                <label className="label">Parameter 2</label>
                <input
                  className="input"
                  value={selectedStep.config.param2 || ""}
                  onChange={(e) =>
                    updateSelectedStepConfig({
                      param2: e.target.value,
                    })
                  }
                />

                <label className="label">Comment</label>
                <input
                  className="input"
                  value={selectedStep.config.comment || ""}
                  onChange={(e) =>
                    updateSelectedStepConfig({
                      comment: e.target.value,
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className="config-footer">
            <button className="apply-btn" disabled={!selectedStep} onClick={() => selectedStep && setApplyModalOpen(true)}>
              Apply
            </button>
          </div>
        </div>
      </div>

      {isProcessDetailOpen && (
        <div className="process-detail-overlay">
          <div className="process-detail-modal">
            <h3>Process Detail</h3>

            <label className="label">Process Name</label>
            <input
              className="input"
              value={processInfo.name}
              onChange={(e) =>
                setProcessInfo({
                  ...processInfo,
                  name: e.target.value,
                })
              }
            />

            <label className="label">Description</label>
            <textarea
              className="textarea"
              value={processInfo.description}
              onChange={(e) =>
                setProcessInfo({
                  ...processInfo,
                  description: e.target.value,
                })
              }
            />

            <label className="label">Hardware Definition</label>
            <select
              className="input"
              value={processInfo.hardwareId || ""}
              onChange={(e) =>
                setProcessInfo({
                  ...processInfo,
                  hardwareId: e.target.value,
                })
              }
            >
              <option value="">Select hardware</option>
              <option value="hw-1">Gantry Loader A</option>
              <option value="hw-2">Backup Config B</option>
              <option value="hw-3">Prototype Line C</option>
            </select>

            <div className="process-detail-modal-footer">
              <button className="process-detail-close-btn" onClick={() => setProcessDetailOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomModal
        open={applyModalOpen}
        title="Apply Step"
        message="Apply changes for this step?"
        confirmText="Apply"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={handleApplyConfirm}
        onCancel={() => setApplyModalOpen(false)}
      />

      <CustomModal
        open={updateModalOpen}
        title="Process Updated"
        message="Save the edited process?"
        confirmText="OK"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={handleUpdateConfirm}
        onCancel={() => setUpdateModalOpen(false)}
      />
    </div>
  );
};

export default ProcessEditPage;
