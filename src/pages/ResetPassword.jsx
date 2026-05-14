import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pesan, setPesan] = useState({ text: '', isError: false, show: false });
  const [serverStatus, setServerStatus] = useState({ status: 'checking', text: 'Menyiapkan Server...' });
  const [tokenValid, setTokenValid] = useState(token ? true : false);
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

  // --- VALIDASI PASSWORD ---
  const validatePassword = (pass) => {
    if (!pass) return 'Password tidak boleh kosong';
    if (pass.length < 8) return 'Password minimal 8 karakter';
    if (pass.length > 100) return 'Password maksimal 100 karakter';
    if (!pass.match(/[a-zA-Z]/)) return 'Password harus mengandung huruf';
    if (!pass.match(/[0-9]/)) return 'Password harus mengandung angka';
    return null;
  };

  // --- HANDLE RESET PASSWORD ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPesan({ text: '', isError: false, show: false });

    if (!token) {
      return showMessage('Token tidak valid. Silakan request reset password lagi.');
    }

    // Validasi password
    const passwordError = validatePassword(password);
    if (passwordError) {
      return showMessage(passwordError);
    }

    // Validasi konfirmasi password
    if (password !== confirmPassword) {
      return showMessage('Password dan konfirmasi password tidak cocok');
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          newPassword: password
        }),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        const errorMessage = data.message || data.error || 'Gagal mereset password';
        showMessage(errorMessage);
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_INVALID') {
          setTokenValid(false);
        }
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000);
        return;
      }

      showMessage(data.message || 'Password berhasil direset! Silakan login dengan password baru.', false);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      showMessage(err.message || 'Terjadi kesalahan. Silakan coba lagi');
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-5 text-gray-800 dark:text-slate-100 font-sans">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-red-500 text-white pt-12 pb-6 px-6 text-center">
            <h2 className="text-[1.75rem] font-bold tracking-tight m-0">
              Link Tidak Valid
            </h2>
          </div>
          <div className="p-7 md:p-8 text-center">
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Link reset password tidak ditemukan. Silakan request reset password lagi.
            </p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full py-3.5 rounded-lg text-base font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-all"
            >
              Request Reset Password
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            Reset Password
          </h2>
        </div>

        {/* Form Body */}
        <div className="p-7 md:p-8">
          {/* Deskripsi */}
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-6 text-center">
            Masukkan password baru Anda. Password harus mengandung huruf dan angka.
          </p>
          
          {/* Info Token & Rate Limiting */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">⚠</span>
              </div>
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Penting!</p>
                <p>Link reset password valid selama 15 menit. Jika kadaluarsa, request ulang dari halaman login.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* Input Password Baru */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full pl-4 pr-12 pt-6 pb-2 border border-gray-300 dark:border-slate-600 rounded-lg text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-transparent"
                placeholder="Password Baru"
                autoComplete="new-password"
                required
                autoFocus
              />
              <label htmlFor="password" className="absolute left-4 top-2 text-xs text-blue-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none font-medium">
                Password Baru
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-gray-400 dark:text-slate-500 hover:text-blue-500 hover:scale-110 transition-all focus:outline-none select-none"
                title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Input Konfirmasi Password */}
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="peer w-full pl-4 pr-12 pt-6 pb-2 border border-gray-300 dark:border-slate-600 rounded-lg text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-transparent"
                placeholder="Konfirmasi Password"
                autoComplete="new-password"
                required
              />
              <label htmlFor="confirmPassword" className="absolute left-4 top-2 text-xs text-blue-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none font-medium">
                Konfirmasi Password
              </label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-4 text-gray-400 dark:text-slate-500 hover:text-blue-500 hover:scale-110 transition-all focus:outline-none select-none"
                title={showConfirmPassword ? "Sembunyikan Password" : "Tampilkan Password"}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Tombol Submit */}
            <button
              type="submit"
              className="w-full py-3.5 mt-4 rounded-lg text-base font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-all transform hover:-translate-y-px"
            >
              {isLoading ? 'Memproses...' : 'Reset Password'}
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
