import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pesan, setPesan] = useState({ text: '', isError: false, show: false });
  
  // State untuk indikator server: status bisa 'checking' (kuning), 'online' (hijau), 'offline' (merah)
  const [serverStatus, setServerStatus] = useState({ status: 'checking', text: 'Menyiapkan Server...' });
  const wasOffline = useRef(false);

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
  const BASE_URL = baseUrl;
  const AUTH_URL = `${baseUrl}/api/auth`;

  // --- FUNGSI CEK STATUS SERVER ---
  const cekStatusServer = async () => {
    // Jika sebelumnya offline, tampilkan status sedang membangunkan
    if (wasOffline.current) {
      setServerStatus({ status: 'checking', text: 'Membangunkan Server...' });
    }

    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        setServerStatus({ status: 'online', text: 'Server Terhubung' });
        
        // Jika baru saja bangun dari mati, reset state offline
        if (wasOffline.current) {
          console.log("Server baru saja aktif!");
          wasOffline.current = false;
        }
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      setServerStatus({ status: 'offline', text: 'Gagal Terhubung' });
      wasOffline.current = true;
    }
  };

  useEffect(() => {
    cekStatusServer();
    // Cek ulang setiap 5 detik
    const intervalId = setInterval(cekStatusServer, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // --- FUNGSI HANDLE AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault(); // Menggantikan deteksi tombol 'Enter', otomatis tertangani oleh form submit
    setPesan({ text: '', isError: false, show: false });

    if (!username.trim()) return showMessage('Username tidak boleh kosong');
    if (!password) return showMessage('Password tidak boleh kosong');
    if (password.length < 6) return showMessage('Password minimal 6 karakter');

    setIsLoading(true);

    try {
      const endpoint = isLoginMode ? 'login' : 'register';
      const res = await fetch(`${AUTH_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        if (res.status === 401 && isLoginMode) {
          throw new Error('🚨 Login Gagal! Username atau password salah.');
        }
        const errText = await res.text();
        throw new Error(errText || 'Terjadi kesalahan');
      }

      if (isLoginMode) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', data.username || username.trim());
          showMessage('✅ Login berhasil! Mengalihkan...', false);
          setTimeout(() => {
            navigate('/dashboard');
          }, 800);
        }
      } else {
        const msg = await res.text();
        showMessage(`✅ ${msg || 'Pendaftaran berhasil! Silakan login.'}`, false);
        setTimeout(() => {
          setIsLoginMode(true);
          setPassword('');
        }, 1800);
      }
    } catch (err) {
      showMessage(err.message || 'Gagal terhubung ke server');
      cekStatusServer(); // Cek server lagi jika gagal (sesuai logika HTML)
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text, isError = true) => {
    setPesan({ text, isError, show: true });
  };

  // Bersihkan pesan error saat user mulai mengetik
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (pesan.show) setPesan({ show: false, text: '', isError: false });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-5 text-gray-800 dark:text-slate-100 font-sans">
      <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200 dark:border-slate-700 overflow-hidden relative transition-all duration-300 ${isLoading ? 'opacity-65 pointer-events-none' : ''}`}>
        
        {/* Server Status Badge */}
        <div className="absolute top-3 left-4 inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-100 bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 rounded-full shadow-sm z-10" title="Status Server">
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
            {isLoginMode ? 'Masuk ke ZonaKas' : 'Buat Akun Baru'}
          </h2>
        </div>

        {/* Form Body */}
        <div className="p-7 md:p-8">
          <form onSubmit={handleAuth} className="space-y-7">
            
            {/* Input Username */}
            <div className="relative">
              <input
                type="text"
                id="username"
                autoFocus // Fokus otomatis saat dimuat
                value={username}
                onChange={handleInputChange(setUsername)}
                className="peer w-full px-4 pt-6 pb-2 border border-gray-300 dark:border-slate-600 rounded-lg text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-transparent"
                placeholder="Username"
                autoComplete="username"
                required
              />
              <label htmlFor="username" className="absolute left-4 top-2 text-xs text-blue-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none font-medium">
                Username
              </label>
            </div>

            {/* Input Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={handleInputChange(setPassword)}
                className="peer w-full pl-4 pr-12 pt-6 pb-2 border border-gray-300 dark:border-slate-600 rounded-lg text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-transparent"
                placeholder="Password"
                autoComplete={isLoginMode ? "current-password" : "new-password"}
                required
              />
              <label htmlFor="password" className="absolute left-4 top-2 text-xs text-blue-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none font-medium">
                Password
              </label>
              
              {/* Tombol Mata (Toggle Password) */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-gray-400 dark:text-slate-500 hover:text-blue-500 hover:scale-110 transition-all focus:outline-none select-none"
                title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Tombol Aksi */}
            <button
              type="submit"
              className={`w-full py-3.5 mt-2 rounded-lg text-base font-semibold text-white transition-all transform hover:-translate-y-px ${isLoginMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {isLoading ? (isLoginMode ? 'Memproses...' : 'Mendaftar...') : (isLoginMode ? 'Masuk' : 'Daftar')}
            </button>
          </form>

          {/* Toggle Link */}
          <div className="text-center mt-5 text-[0.95rem] text-gray-500 dark:text-slate-400">
            {isLoginMode ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              type="button"
              onClick={() => { 
                setIsLoginMode(!isLoginMode); 
                setPesan({ show: false });
                setUsername('');
                setPassword('');
              }}
              className="text-blue-500 font-semibold hover:underline focus:outline-none"
            >
              {isLoginMode ? 'Daftar sekarang' : 'Masuk'}
            </button>
          </div>

          {/* Pesan Error / Sukses */}
          {pesan.show && (
            <div 
              className={`mt-4 p-3 rounded-lg text-sm font-semibold text-center border ${pesan.isError ? 'bg-[#fadbd8] dark:bg-red-900 text-[#c0392b] dark:text-red-100 border-[#e74c3c] dark:border-red-700' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 border-emerald-500 dark:border-emerald-700'}`}
              // Menggunakan dangerouslySetInnerHTML agar tag <b> dari HTML sebelumnya bisa dirender
              dangerouslySetInnerHTML={{ __html: pesan.text }} 
            />
          )}
        </div>
      </div>
    </div>
  );
}