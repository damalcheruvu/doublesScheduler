export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-lg bg-white p-4 shadow-xl">
        <h4 className="mb-2 text-lg font-bold text-gray-900">{title}</h4>
        <p className="mb-4 text-base text-gray-700">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="rounded-lg border-2 border-red-300 bg-red-600 px-3 py-2 text-base font-bold text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
