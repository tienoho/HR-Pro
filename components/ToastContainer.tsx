import React, { useState, useEffect } from 'react';
import { toast, ToastMessage } from '../services/errorHandler';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((message) => {
      setToasts((prev) => [...prev, message]);
      
      if (message.duration) {
        setTimeout(() => {
          removeToast(message.id);
        }, message.duration);
      }
    });

    return () => unsubscribe();
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={`pointer-events-auto min-w-[300px] max-w-sm rounded-lg shadow-lg border p-4 flex gap-3 animate-in slide-in-from-right-full transition-all duration-300 transform
            ${t.type === 'success' ? 'bg-white border-green-200 shadow-green-500/10' : ''}
            ${t.type === 'error' ? 'bg-white border-red-200 shadow-red-500/10' : ''}
            ${t.type === 'warning' ? 'bg-white border-amber-200 shadow-amber-500/10' : ''}
            ${t.type === 'info' ? 'bg-white border-blue-200 shadow-blue-500/10' : ''}
          `}
        >
          <div className="flex-shrink-0 pt-0.5">
            {t.type === 'success' && <CheckCircle size={20} className="text-green-500" />}
            {t.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
            {t.type === 'warning' && <AlertTriangle size={20} className="text-amber-500" />}
            {t.type === 'info' && <Info size={20} className="text-blue-500" />}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-slate-800">{t.title}</h4>
            <p className="text-sm text-slate-600 mt-0.5">{t.message}</p>
          </div>
          <button 
            onClick={() => removeToast(t.id)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
