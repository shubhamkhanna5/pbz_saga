
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Dialog from './Dialog';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogContextType {
  showAlert: (message: string, title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string, options?: Partial<DialogOptions>) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions>({ message: '' });

  const showAlert = useCallback((message: string, title: string = 'ALERT') => {
    setOptions({
      message,
      title,
      type: 'alert',
      confirmLabel: 'OK',
    });
    setIsOpen(true);
  }, []);

  const showConfirm = useCallback((
    message: string, 
    onConfirm: () => void, 
    title: string = 'CONFIRM',
    extraOptions: Partial<DialogOptions> = {}
  ) => {
    setOptions({
      message,
      title,
      type: 'confirm',
      onConfirm,
      confirmLabel: 'YES',
      cancelLabel: 'NO',
      ...extraOptions,
    });
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (options.onCancel) {
      options.onCancel();
    }
    setIsOpen(false);
  }, [options]);

  const handleConfirm = useCallback(() => {
    if (options.onConfirm) {
      options.onConfirm();
    }
    setIsOpen(false);
  }, [options]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title={options.title || (options.type === 'confirm' ? 'CONFIRM' : 'ALERT')}
        message={options.message}
        type={options.type}
        onConfirm={handleConfirm}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
      />
    </DialogContext.Provider>
  );
};
