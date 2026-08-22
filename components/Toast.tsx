// components/Toast.tsx
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
}

export default function Toast({ message, show, onClose }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onClose(), 3000); // Auto-hide after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-[63px] left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-top fade-in duration-300 w-full max-w-sm px-4">
      <div className="bg-green-900 border border-green-500 text-green-100 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
        <span>🎉</span>
        <p className="font-bold">{message}</p>
      </div>
    </div>
  );
}