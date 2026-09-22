import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';
import { PageFlipModal } from './PageFlipModal';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'pooja05414') {
      setHasError(false);
      setPasscode('');
      onSuccess();
    } else {
      setHasError(true);
    }
  };

  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md" id="passwordModal">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-950 border-b border-rose-700 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
          <Lock className="w-4 h-4 text-[#EF3340]" /> Admin Authentication Required
        </h2>
        <button
          onClick={onClose}
          className="bg-[#E4002B] hover:bg-rose-700 text-white rounded-xl p-1.5 cursor-pointer transition border border-white/20 shadow-sm"
          title="Close Modal"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-slate-900 text-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
            Admin Passcode
          </label>
          <input
            type="password"
            id="adminPassInput"
            autoFocus
            required
            autoComplete="off"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setHasError(false);
            }}
            placeholder="Enter passcode..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {hasError && (
            <p id="passwordError" className="text-xs text-rose-400 mt-1.5 flex items-center gap-1.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5" /> Incorrect passcode. Please try again.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl transition cursor-pointer font-mono border border-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold bg-[#EF3340] hover:bg-rose-600 text-white rounded-xl transition shadow-lg shadow-rose-950/50 cursor-pointer font-mono border border-rose-500/30"
          >
            Authenticate
          </button>
        </div>
      </form>
    </PageFlipModal>
  );
};
