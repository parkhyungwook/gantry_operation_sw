// src/pages/ProcessAddPage.tsx
import React, { useState } from "react";
import CustomModal from "../components/CustomModal";
import "./ProcessAddPage.css";

type FunctionGroup =
  | "Gantry"
  | "Machine"
  | "Stocker"
  | "Turnover"
  | "Buffer"
  | "Etc";

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
  id: string;          // 고유 ID
  templateId: string;  // 어떤 PaletteItem에서 왔는지
  name: string;
  group: FunctionGroup;
  config: StepConfig;
};

type ProcessInfo = {
  name: string;
  description: string;
  hardwareId?: string;
};

/* ---------- 팔레트(좌측 Job List) 더미 데이터 ---------- */

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

const ProcessAddPage: React.FC = () => {
  /* ---------- Process Detail ---------- */
  const [processInfo, setProcessInfo] = useState<ProcessInfo>({
    name: "",
    description: "",
    hardwareId: "",
  });
  const [isProcessDetailOpen, setProcessDetailOpen] = useState(false);

  /* ---------- Job List 아코디언 열림 상태 ---------- */
  const [openGroups, setOpenGroups] = useState<Record<FunctionGroup, boolean>>({
    Gantry: true,
    Machine: true,
    Stocker: false,
    Turnover: false,
    Buffer: false,
    Etc: false,
  });

  /* ---------- Flow Steps & 선택 ---------- */
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // 드롭 위치 인덱스 (0 ~ steps.length)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ID 증가용 카운터
  const [stepIdCounter, setStepIdCounter] = useState(1);

  /* ---------- 모달 (Apply / Save) ---------- */
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  /* ---------- 유틸 ---------- */

  // 현재 선택된 Step
  const selectedStep = steps.find((s) => s.id === selectedStepId) || null;
  const selectedIndex = selectedStep
    ? steps.findIndex((s) => s.id === selectedStep.id)
    : -1;

  // Job List 그룹 토글
  const toggleGroup = (group: FunctionGroup) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // PaletteItem 찾기
  const findPaletteItem = (templateId: string): PaletteItem | undefined => {
    for (const g of paletteGroups) {
      const found = g.items.find((i) => i.id === templateId);
      if (found) return found;
    }
    return undefined;
  };

  /* ---------- Drag & Drop ---------- */

  // 팔레트 아이템 드래그 시작
  const handlePaletteDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    item: PaletteItem
  ) => {
    e.dataTransfer.effectAllowed = "copyMove";
    e.dataTransfer.setData("app/type", "palette");
    e.dataTransfer.setData("app/paletteId", item.id);
  };

  // Flow 내 Step 드래그 시작 (재정렬)
  const handleFlowStepDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    stepId: string
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("app/type", "flow");
    e.dataTransfer.setData("app/stepId", stepId);
  };

  // Flow 영역 전체에 대한 DragOver (드롭 가능 표시)
  const handleFlowDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // 각 슬롯(사이사이)에 Mouse가 올라왔을 때 인덱스 지정
  const handleSlotDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  // 드롭 처리
  const handleFlowDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("app/type");

    let targetIndex =
      dragOverIndex !== null ? dragOverIndex : steps.length;

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

      // 새로 추가된 Step 선택
      setSelectedStepId(newId);
    } else if (type === "flow") {
      const stepId = e.dataTransfer.getData("app/stepId");
      setSteps((prev) => {
        const fromIndex = prev.findIndex((s) => s.id === stepId);
        if (fromIndex === -1) return prev.slice();

        const arr = [...prev];
        const [moved] = arr.splice(fromIndex, 1);

        // 위에서 하나를 뺐으므로, 뒤쪽으로 옮길 때 index 보정
        if (targetIndex > fromIndex) {
          targetIndex -= 1;
        }

        arr.splice(targetIndex, 0, moved);
        return arr;
      });
    }

    // 드롭이 끝났으니 placeholder 제거
    setDragOverIndex(null);
  };

  // Flow 영역에서 드래그가 완전히 나갔을 때 placeholder 제거
  const handleFlowDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // 진짜로 영역 밖으로 나갈 때만 처리 (자식으로 이동하는 경우는 무시)
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

  /* ---------- Step Detail 변경 ---------- */

  const updateSelectedStepConfig = (patch: Partial<StepConfig>) => {
    if (!selectedStep) return;
    setSteps((prev) =>
      prev.map((s) =>
        s.id === selectedStep.id
          ? { ...s, config: { ...s.config, ...patch } }
          : s
      )
    );
  };

  const handleDeleteStep = () => {
    if (!selectedStep) return;
    setSteps((prev) => prev.filter((s) => s.id !== selectedStep.id));
    setSelectedStepId(null);
  };

  /* ---------- Apply / Save ---------- */

  const handleApplyConfirm = () => {
    // 나중에 백엔드로 Step 설정 전달 예정
    setApplyModalOpen(false);
  };

  const handleSaveConfirm = () => {
    // 나중에 전체 Process 저장 로직 연결 예정
    setSaveModalOpen(false);
  };

  return (
    <div className="process-page">
      {/* 상단: Process Detail + Save 버튼 */}
      <div className="process-topbar">
        <button
          className="process-detail-toggle"
          onClick={() => setProcessDetailOpen(true)}
        >
          Process Detail
        </button>

        <button
          className="process-save-icon-btn"
          onClick={() => setSaveModalOpen(true)}
        >
          Save
        </button>
      </div>

      {/* 메인 3열 영역 */}
      <div className="process-main">
        {/* ===== 좌측 Job List ===== */}
        <div className="joblist-container">
          <h2>Job List</h2>

          {paletteGroups.map(({ group, title, items }) => {
            const isOpen = openGroups[group];
            return (
              <div key={group} className="joblist-group">
                <div
                  className="joblist-group-header"
                  onClick={() => toggleGroup(group)}
                >
                  <span>{title}</span>
                  <span>{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div className="joblist-items">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="joblist-item"
                        draggable
                        onDragStart={(e) =>
                          handlePaletteDragStart(e, item)
                        }
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

        {/* ===== 가운데 Process Flow ===== */}
        <div className="flow-container">
          <h2>Process Flow</h2>

          <div
            className="flow-scroll"
            onDragOver={handleFlowDragOver}
            onDrop={handleFlowDrop}
            onDragLeave={handleFlowDragLeave}
          >
            {steps.length === 0 && (
              <div className="flow-placeholder">
                Drag &amp; Drop from Job List
              </div>
            )}

            {/* 슬롯 + Step 카드 렌더링 */}
            {steps.length > 0 && (
              <>
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    {/* 이 위치에 드랍 가능 슬롯 */}
                    <div
                      className="flow-drop-slot"
                      onDragOver={(e) =>
                        handleSlotDragOver(e, index)
                      }
                    >
                      {dragOverIndex === index && (
                        <div className="flow-placeholder-slot">
                          Drop here
                        </div>
                      )}
                    </div>

                    {/* 실제 Step 카드 */}
                    <div
                      className={
                        "flow-step" +
                        (step.id === selectedStepId
                          ? " selected"
                          : "")
                      }
                      draggable
                      onDragStart={(e) =>
                        handleFlowStepDragStart(e, step.id)
                      }
                      onDragEnd={handleFlowDragEnd}
                      onClick={() => setSelectedStepId(step.id)}
                    >
                      <div className="flow-step-label">
                        <span className="flow-step-name">
                          Step {index + 1} - {step.name}
                        </span>
                        <span className="flow-step-group">
                          {step.group} Function
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                ))}

                {/* 마지막(맨 끝) 슬롯 */}
                <div
                  className="flow-drop-slot"
                  onDragOver={(e) =>
                    handleSlotDragOver(e, steps.length)
                  }
                >
                  {dragOverIndex === steps.length && (
                    <div className="flow-placeholder-slot">
                      Drop here
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===== 우측 Step Detail ===== */}
        <div className="config-container">
          <div className="config-header">
            <h2>
              Step Detail
              {selectedStep && selectedIndex >= 0
                ? ` (Step ${selectedIndex + 1})`
                : ""}
            </h2>

            {selectedStep && (
              <button
                className="delete-step-btn"
                onClick={handleDeleteStep}
              >
                Delete Step
              </button>
            )}
          </div>

          <div className="config-body">
            {!selectedStep && (
              <div className="config-placeholder">
                Select a step in Process Flow.
              </div>
            )}

            {selectedStep && (
              <div className="config-box">
                <p>
                  <strong>Function:</strong> {selectedStep.name}
                </p>
                <p>
                  <strong>Group:</strong> {selectedStep.group}
                </p>

                {/* 예시 설정값들 */}
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

          {/* Step Detail Apply 버튼 */}
          <div className="config-footer">
            <button
              className="apply-btn"
              disabled={!selectedStep}
              onClick={() => selectedStep && setApplyModalOpen(true)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* ===== Process Detail Overlay ===== */}
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
              <button
                className="process-detail-close-btn"
                onClick={() => setProcessDetailOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Apply 모달 ===== */}
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

      {/* ===== Save 모달 ===== */}
      <CustomModal
        open={saveModalOpen}
        title="Save Process"
        message="Save this process definition?"
        confirmText="Save"
        cancelText="Cancel"
        confirmColor="green"
        onConfirm={handleSaveConfirm}
        onCancel={() => setSaveModalOpen(false)}
      />
    </div>
  );
};

export default ProcessAddPage;
