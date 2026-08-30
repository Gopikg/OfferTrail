function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="surface p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-3">
          Confirm Action
        </h2>

        <p className="text-gray-600 mb-6">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="secondary-button"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="danger-button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
