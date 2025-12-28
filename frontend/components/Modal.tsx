'use client';

import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg max-w-[700px] w-full max-h-[calc(100vh-32px)] overflow-auto shadow-lg dark:shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-border flex-shrink-0">
          <h2 className="m-0 text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none text-2xl cursor-pointer text-muted-foreground hover:text-foreground p-0 w-8 h-8 flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

