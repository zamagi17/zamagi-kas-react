import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react'; // Ikon Mail dihapus
import { auth } from '../config/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Login() {
  const navigate = useNavigate();
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // State dasar
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // State tambahan untuk registrasi
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [pesan, setPesan] = useState({ text: '', isError: false, show: false });
  
  // State untuk indikator server
  const [serverStatus, setServerStatus] = useState({ status: 'checking', text: 'Menyiapkan Server...' });
  const wasOffline = useRef(false);

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
  const BASE_URL = baseUrl;
  const AUTH_URL = `${baseUrl}/api/auth`;

  // --- FUNGSI CEK STATUS SERVER ---
  const cekStatusServer = async () => {
    if (wasOffline.current) {
      setServerStatus({ status: 'checking', text: 'Membangunkan Server...' });
    }

    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        setServerStatus({ status: 'online', text: 'Server Terhubung' });
        
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
    const intervalId = setInterval(cekStatusServer, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // --- FUNGSI LOGIN DENGAN GOOGLE ---
  const handleGoogleLogin = async () => {
    setPesan({ text: '', isError: false, show: false });
    setIsGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      // Kirim Firebase ID token ke backend untuk verifikasi dan login
      const res = await fetch(`${AUTH_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Gagal login dengan Google');
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('username', data.username);
        if (data.namaLengkap) localStorage.setItem('namaLengkap', data.namaLengkap);
        localStorage.setItem('authProvider', data.authProvider || 'FIREBASE');

        showMessage('✅ Login dengan Google berhasil! Mengalihkan...', false);
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err) {
      console.error('Google login error:', err);
      showMessage(err.message || 'Gagal login dengan Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // --- FUNGSI HANDLE AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setPesan({ text: '', isError: false, show: false });

    // Validasi umum
    if (!username.trim()) return showMessage('Username tidak boleh kosong');
    if (!password) return showMessage('Password tidak boleh kosong');
    if (password.length < 6) return showMessage('Password minimal 8 karakter');

    // Validasi khusus saat mendaftar
    if (!isLoginMode) {
      if (!namaLengkap.trim()) return showMessage('Nama Lengkap tidak boleh kosong');
      if (!email.trim() || !email.includes('@')) return showMessage('Email tidak valid');
    }

    setIsLoading(true);

    try {
      const endpoint = isLoginMode ? 'login' : 'register';
      
      // Siapkan data yang akan dikirim (payload)
      const payload = isLoginMode 
        ? { username: username.trim(), password }
        : { 
            username: username.trim(), 
            password, 
            namaLengkap: namaLengkap.trim(), 
            email: email.trim() 
          };

      const res = await fetch(`${AUTH_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('username', data.username || username.trim());
          
          if (data.namaLengkap) localStorage.setItem('namaLengkap', data.namaLengkap);
          localStorage.setItem('authProvider', data.authProvider || 'LOCAL');

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
          setNamaLengkap('');
          setEmail('');
        }, 1800);
      }
    } catch (err) {
      showMessage(err.message || 'Gagal terhubung ke server');
      cekStatusServer(); 
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text, isError = true) => {
    setPesan({ text, isError, show: true });
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (pesan.show) setPesan({ show: false, text: '', isError: false });
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode); 
    setPesan({ show: false });
    setUsername('');
    setPassword('');
    setNamaLengkap('');
    setEmail('');
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
            
            {/* Input Tambahan: Hanya muncul saat mendaftar */}
            {!isLoginMode && (
              <>
                <div className="relative">
                  <input
                    type="text"
                    id="namaLengkap"
                    value={namaLengkap}
                    onChange={handleInputChange(setNamaLengkap)}
                    className="peer w-full px-4 pt-6 pb-2 border border-gray-300 dark:border-slate-600 rounded-lg text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-transparent"
                    placeholder="Nama Lengkap"
                    required={!isLoginMode}
                  />
                  <label htmlFor="namaLengkap" className="absolute left-4 top-2 text-xs text-blue-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none font-medium">
                    Nama Lengkap
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={handleInputChange(setEmail)}
                    className="peer w-full px-4 pt-6 pb-2 border border-gray-300 dark:border-slate-600 rounded-lg text-base focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-transparent"
                    placeholder="Email"
                    required={!isLoginMode}
                  />
                  <label htmlFor="email" className="absolute left-4 top-2 text-xs text-blue-500 transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 dark:peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none font-medium">
                    Email
                  </label>
                </div>
              </>
            )}

            {/* Input Username */}
            <div className="relative">
              <input
                type="text"
                id="username"
                autoFocus 
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

          {/* Divider (Dikeluarkan dari isLoginMode agar tampil di kedua form) */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-300 dark:bg-slate-700"></div>
            <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase">Atau</span>
            <div className="flex-1 h-px bg-gray-300 dark:bg-slate-700"></div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3.5 rounded-lg text-base font-semibold text-gray-700 dark:text-slate-100 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all transform hover:-translate-y-px disabled:opacity-60 flex items-center justify-center gap-3"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            {isGoogleLoading ? 'Memproses...' : (isLoginMode ? 'Masuk dengan Google' : 'Daftar dengan Google')}
          </button>

          {/* Toggle Link */}
          <div className="text-center mt-5 text-[0.95rem] text-gray-500 dark:text-slate-400">
            {isLoginMode ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-500 font-semibold hover:underline focus:outline-none"
            >
              {isLoginMode ? 'Daftar sekarang' : 'Masuk'}
            </button>
          </div>

          {/* Pesan Error / Sukses */}
          {pesan.show && (
            <div 
              className={`mt-4 p-3 rounded-lg text-sm font-semibold text-center border ${pesan.isError ? 'bg-[#fadbd8] dark:bg-red-900 text-[#c0392b] dark:text-red-100 border-[#e74c3c] dark:border-red-700' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 border-emerald-500 dark:border-emerald-700'}`}
              dangerouslySetInnerHTML={{ __html: pesan.text }} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
