import React from 'react';
import useModal from '../hooks/useModal';

const ModalDemo = () => {
  const { alert, confirm, prompt, renderModal } = useModal();

  const handleAlert = async () => {
    await alert('Ini adalah pesan alert!', 'Info');
  };

  const handleConfirm = async () => {
    const result = await confirm('Apakah Anda yakin ingin melanjutkan?', 'Konfirmasi');
    alert(result ? 'Anda memilih Ya' : 'Anda memilih Batal');
  };

  const handlePrompt = async () => {
    const result = await prompt('Masukkan nama Anda:', 'John Doe', 'Nama lengkap');
    if (result) {
      alert(`Halo, ${result}!`);
    } else {
      alert('Input dibatalkan');
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Demo Modal Modern
      </h1>

      <div className="space-x-4">
        <button
          onClick={handleAlert}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Alert
        </button>

        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
        >
          Confirm
        </button>

        <button
          onClick={handlePrompt}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
        >
          Prompt
        </button>
      </div>

      {/* Render modal */}
      {renderModal()}
    </div>
  );
};

export default ModalDemo;