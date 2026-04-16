import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Moon, Sun, LogOut, User, Shield, Info, Wallet, Check, Plus, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import useDarkMode from '../hooks/useDarkMode';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');

const DAFTAR_ASET = [
    'BCA', 'SeaBank', 'Bank Jago', 'Bank BRI', 'Dompet Tunai',
    'e-Wallet (Gopay/OVO/Dana)', 'Bank RDN', 'Reksa Dana', 'Emas/Logam Mulia'
];

export default function Settings() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('username');
    const { isDark, toggle } = useDarkMode();

    const [dompetHarian, setDompetHarian] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null); // { text, ok }

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    // Ambil preferensi dari backend saat halaman dibuka
    useEffect(() => {
        if (!token) return;
        fetch(`${baseUrl}/api/user/preferences`, {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.dompetHarian) setDompetHarian(data.dompetHarian);
            })
            .catch(() => {});
    }, [token]);

    const toggleAset = (aset) => {
        setDompetHarian(prev =>
            prev.includes(aset)
                ? prev.filter(a => a !== aset)
                : [...prev, aset]
        );
    };

    const simpanDompetHarian = async () => {
        setIsSaving(true);
        setSaveMsg(null);
        try {
            const res = await fetch(`${baseUrl}/api/user/preferences`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dompetHarian })
            });
            if (res.ok) {
                setSaveMsg({ text: '✅ Dompet harian berhasil disimpan!', ok: true });
            } else {
                const err = await res.text();
                setSaveMsg({ text: `❌ Gagal: ${err}`, ok: false });
            }
        } catch {
            setSaveMsg({ text: '❌ Gagal terhubung ke server', ok: false });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMsg(null), 3000);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

                {/* Header */}
                <div>
                    <h2 className="text-xl font-bold">Pengaturan</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Kelola preferensi aplikasi kamu</p>
                </div>

                {/* Profil */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Profil</p>
                    </div>
                    <div className="flex items-center gap-4 px-4 py-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User size={22} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{currentUser}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Pengguna aktif</p>
                        </div>
                    </div>
                </div>

                {/* === DOMPET HARIAN === */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dompet Harian</p>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Pilih aset yang kamu gunakan untuk transaksi harian. Saldo gabungan aset ini akan ditampilkan di Dashboard.
                        </p>

                        {/* Grid pilihan aset */}
                        <div className="grid grid-cols-2 gap-2">
                            {DAFTAR_ASET.map(aset => {
                                const dipilih = dompetHarian.includes(aset);
                                return (
                                    <button
                                        key={aset}
                                        onClick={() => toggleAset(aset)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-all
                                            ${dipilih
                                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all
                                            ${dipilih
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                            {dipilih && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <span className="leading-tight">{aset}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Summary yang dipilih */}
                        {dompetHarian.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {dompetHarian.map(a => (
                                    <span key={a} className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                                        <Wallet size={11} />
                                        {a}
                                        <button onClick={() => toggleAset(a)} className="hover:text-red-500 transition-colors ml-0.5">
                                            <X size={11} strokeWidth={3} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Tombol simpan */}
                        <button
                            onClick={simpanDompetHarian}
                            disabled={isSaving}
                            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan Dompet Harian'}
                        </button>

                        {/* Pesan sukses/gagal */}
                        {saveMsg && (
                            <p className={`text-sm font-medium text-center ${saveMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                                {saveMsg.text}
                            </p>
                        )}
                    </div>
                </div>

                {/* Tampilan */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tampilan</p>
                    </div>
                    <div className="flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3">
                            {isDark
                                ? <Moon size={20} className="text-blue-400" />
                                : <Sun size={20} className="text-amber-500" />
                            }
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Mode Gelap</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {isDark ? 'Aktif — tampilan gelap' : 'Nonaktif — tampilan terang'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={toggle}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none
                                ${isDark ? 'bg-blue-500' : 'bg-slate-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300
                                ${isDark ? 'translate-x-6' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Keamanan */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Keamanan</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-4">
                        <Shield size={20} className="text-emerald-500" />
                        <div>
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">JWT Authentication</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Sesi aman dengan token 24 jam</p>
                        </div>
                    </div>
                </div>

                {/* Tentang */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tentang</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-700">
                        <Info size={20} className="text-slate-400" />
                        <div>
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">ZonaKas</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Aplikasi pencatatan keuangan pribadi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-4">
                        <Info size={20} className="text-slate-400" />
                        <div>
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Versi</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">1.0.0</p>
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/20 text-red-500 font-bold rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                >
                    <LogOut size={18} /> Logout
                </button>

            </div>
        </div>
    );
}
