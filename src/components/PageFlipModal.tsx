import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface PageFlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  id?: string;
}

export const PageFlipModal: React.FC<PageFlipModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-6xl',
  id,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id={id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-[64px] inset-x-0 bottom-0 z-40 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 overflow-hidden border-t border-rose-700/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`w-full h-full ${maxWidthClass} bg-white/95 backdrop-blur-xl flex flex-col overflow-hidden text-slate-800 shadow-2xl border border-rose-100/50 rounded-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
