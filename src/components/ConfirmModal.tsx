import React from 'react';
import { PageFlipModal } from './PageFlipModal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
}) => {
  return (
    <PageFlipModal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-sm" id="confirmModal">
      <div className="p-6 space-y-4 bg-white text-slate-800 flex-1 overflow-y-auto">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition"
          >
            Delete
          </button>
        </div>
      </div>
    </PageFlipModal>
  );
};
