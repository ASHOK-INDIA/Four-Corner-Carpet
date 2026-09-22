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
          className="fixed top-[64px] inset-x-0 bottom-0 z-40 bg-slate-950 flex flex-col w-full h-[calc(100vh-64px)] overflow-hidden p-0 border-t border-rose-700/80"
          style={{ perspective: 1200 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full h-full bg-slate-950 flex flex-col overflow-hidden text-slate-100 shadow-none border-0 rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
