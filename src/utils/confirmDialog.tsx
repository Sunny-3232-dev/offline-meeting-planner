import React, { useEffect, useState } from 'react';

type Resolver = (ok: boolean) => void;

let activeResolver: Resolver | null = null;
let setStateExternal: ((msg: string | null) => void) | null = null;

export function confirmDialog(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!setStateExternal) {
      // Host not mounted: fall back to native (dev safety net)
      resolve(window.confirm(message));
      return;
    }
    activeResolver = (ok) => {
      activeResolver = null;
      resolve(ok);
    };
    setStateExternal(message);
  });
}

export function ConfirmDialogHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setStateExternal = setMessage;
    return () => {
      setStateExternal = null;
    };
  }, []);

  if (message === null) return null;

  const handleAnswer = (ok: boolean) => {
    setMessage(null);
    activeResolver?.(ok);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(27,28,28,0.45)' }}
      onClick={() => handleAnswer(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => handleAnswer(false)}
            className="px-4 py-2 text-sm font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="px-5 py-2 text-sm font-medium rounded-full bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
