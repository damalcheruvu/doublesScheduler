import { useEffect } from 'react';

export default function Toast({
  message,
  type = 'info',
  onClose,
  duration = 2000,
}) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(id);
  }, [message, duration, onClose]);

  if (!message) return null;

  const base =
    'fixed left-1/2 -translate-x-1/2 bottom-6 z-50 rounded-lg px-4 py-2 shadow-lg text-white text-base';
  const colors = {
    info: 'bg-gray-800',
    success: 'bg-green-600',
    error: 'bg-red-600',
  };

  return <div className={`${base} ${colors[type]}`}>{message}</div>;
}
