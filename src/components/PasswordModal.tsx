import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [passcode, setPasscode] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin123' || passcode === '1234') {
      setHasError(false);
      setPasscode('');
      onSuccess();
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      id="passwordModal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#EF3340]" /> Admin Authentication Required
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Admin Passcode
            </label>
            <input
              type="password"
              id="adminPassInput"
              autoFocus
              required
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setHasError(false);
              }}
              placeholder="Enter passcode (e.g. admin123)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#EF3340] font-mono"
            />
            {hasError && (
              <p id="passwordError" className="text-xs text-rose-600 mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Incorrect passcode. Please try again.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-[#EF3340] hover:bg-rose-700 text-white rounded-xl transition shadow-sm cursor-pointer"
            >
              Authenticate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
