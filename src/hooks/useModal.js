import React, { useState, useCallback } from 'react';
import Modal from './Modal';

const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'alert', 'confirm', 'prompt'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    inputValue: '',
    inputPlaceholder: '',
  });

  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const alert = useCallback((message, title = 'Pemberitahuan') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          closeModal();
          resolve(true);
        },
        onCancel: null,
        inputValue: '',
        inputPlaceholder: '',
      });
    });
  }, [closeModal]);

  const confirm = useCallback((message, title = 'Konfirmasi') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          closeModal();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          resolve(false);
        },
        inputValue: '',
        inputPlaceholder: '',
      });
    });
  }, [closeModal]);

  const prompt = useCallback((message, defaultValue = '', placeholder = '', title = 'Input') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        onConfirm: (value) => {
          closeModal();
          resolve(value);
        },
        onCancel: () => {
          closeModal();
          resolve(null);
        },
        inputValue: defaultValue,
        inputPlaceholder: placeholder,
      });
    });
  }, [closeModal]);

  const renderModal = () => {
    if (!modalState.isOpen) return null;

    const handleConfirm = () => {
      if (modalState.type === 'prompt') {
        modalState.onConfirm(modalState.inputValue);
      } else {
        modalState.onConfirm();
      }
    };

    const handleCancel = () => {
      if (modalState.onCancel) {
        modalState.onCancel();
      }
    };

    const handleInputChange = (e) => {
      setModalState(prev => ({
        ...prev,
        inputValue: e.target.value,
      }));
    };

    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && modalState.type !== 'confirm') {
        handleConfirm();
      }
    };

    return (
      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCancel}
        title={modalState.title}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-700 dark:text-slate-300">
            {modalState.message}
          </p>

          {modalState.type === 'prompt' && (
            <input
              type="text"
              value={modalState.inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={modalState.inputPlaceholder}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          )}

          <div className="flex justify-end space-x-2">
            {modalState.type === 'confirm' && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                Batal
              </button>
            )}
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {modalState.type === 'alert' ? 'OK' : 'Ya'}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  return {
    alert,
    confirm,
    prompt,
    renderModal,
  };
};

export default useModal;