import React from "react";
import "./CustomModal.css";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  /** optional color style for confirm button (e.g. "green") */
  confirmColor?: "green" | "red" | "default" | string;
};

const CustomModal: React.FC<Props> = ({
  open,
  title = "Confirm",
  message = "",
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  confirmColor = "red",
}) => {
  if (!open) return null;

  // choose extra class for confirm color
  const confirmClass =
    confirmColor === "green"
      ? "confirm-green"
      : confirmColor === "red"
      ? "confirm-red"
      : "";

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <h3 className="modal-title">{title}</h3>
        <div className="modal-message">{message}</div>

        <div className="modal-buttons">
          <button className="modal-btn cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`modal-btn confirm ${confirmClass}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
