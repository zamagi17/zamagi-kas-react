import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pesan, setPesan] = useState({ text: '', isError: false, show: false });
  const [serverStatus, setServerStatus] = useState({ status: 'checking', text: 'Menyiapkan Server...' });
  const wasOffline = useRef(false);

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
  const AUTH_URL = `${baseUrl}/api/auth`;

  // --- CEK STATUS SERVER ---
  const cekStatusServer = async () => {
    if (wasOffline.current) {
      setServerStatus({ status: 'checking', text: 'Membangunkan Server...' });
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        setServerStatus({ status: 'online', text: 'Server Terhubung' });
        if (wasOffline.current) {
          wasOffline.current = false;
        }
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      wasOffline.current = true;
      setServerStatus({ status: 'offline', text: 'Server Offline' });
    }
  };

  useEffect(() => {
    cekStatusServer();
    const interval = setInterval(cekStatusServer, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- SHOW MESSAGE ---
  const showMessage = (text, isError = true) => {
    setPesan({ text, isError, show: true });
    setTimeout(() => setPesan({ ...pesan, show: false }), 5000);
  };

  // --- HANDLE FORGOT PASSWORD ---
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setPesan({ text: '', isError: false, show: false });

    if (!username.trim()) {
      return showMessage('Username tidak boleh kosong');
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          frontendBaseUrl: window.location.origin
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Gagal memproses permintaan');
      }

      // Tampilkan pesan sukses (generic untuk security)
      showMessage(data.message || 'Jika username terdaftar, link reset password akan dikirim ke email Anda', false);
      
      // Redirect ke login setelah 3 detik
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      showMessage(err.message || 'Terjadi kesalahan. Silakan coba lagi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-5 text-gray-800 dark:text-slate-100 font-sans">
      <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200 dark:border-slate-700 overflow-hidden relative transition-all duration-300 ${isLoading ? 'opacity-65 pointer-events-none' : ''}`}>
        
        {/* Server Status Badge */}
        <div className="absolute top-3 left-4 inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-100 bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 rounded-full shadow-sm z-10">
          <span className={`w-2.5 h-2.5 rounded-full 
            ${serverStatus.status === 'online' ? 'bg-emerald-400 shadow-[0_0_6px_#2ecc71]' : ''}
            ${serverStatus.status === 'offline' ? 'bg-red-500 shadow-[0_0_6px_#e74c3c]' : ''}
            ${serverStatus.status === 'checking' ? 'bg-yellow-400 shadow-[0_0_6px_#f1c40f] animate-pulse' : ''}
          `}></span>
          {serverStatus.text}
        </div>

        {/* Header */}
        <div className="bg-blue-500 text-white pt-12 pb-6 px-6 text-center">
          <h2 className="text-[1.75rem] font-bold tracking-tight m-0">
            Lupa Password
          </h2>
        </div>

        {/* Form Body */}
        <div className="p-7 md:p-8">
          {/* Deskripsi */}
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-6 text-center">
            Masukkan username Anda. Kami akan mengirimkan link reset password ke email terdaftar.
          </p>
          
          {/* Info Rate Limiting */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">ℹ</span>
              </div>
              <div className="text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Batas Permintaan</p>
                <p>Maksimal 3 kali permintaan reset password per jam</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-5">
            {/* Input Username */}
            <div className="relative">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="peer w-full px-4 pt-6 pb-2 border border-gray-300 dark:border-slate-600 rounded-lg text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-transparent"
                placeholder="Username"
                autoComplete="username"
                autoFocus
                required
              />
              <label htmlFor="username" className="absolute left-4 top-2 text-xs text-blue-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none font-medium">
                Username
              </label>
            </div>

            {/* Tombol Submit */}
            <button
              type="submit"
              className="w-full py-3.5 mt-4 rounded-lg text-base font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-all transform hover:-translate-y-px"
            >
              {isLoading ? 'Memproses...' : 'Kirim Link Reset'}
            </button>
          </form>

          {/* Back to Login */}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full mt-4 py-3 rounded-lg text-base font-semibold text-gray-700 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all transform hover:-translate-y-px flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Kembali ke Login
          </button>

          {/* Pesan Error / Sukses */}
          {pesan.show && (
            <div 
              className={`mt-4 p-3 rounded-lg text-sm font-semibold text-center border ${pesan.isError ? 'bg-[#fadbd8] dark:bg-red-900 text-[#c0392b] dark:text-red-100 border-[#e74c3c] dark:border-red-700' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 border-emerald-500 dark:border-emerald-700'}`}
            >
              {pesan.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
