import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    Moon, Sun, LogOut, User, Shield, Info, Wallet,
    Check, X, Eye, EyeOff, Lock, AlertTriangle, Edit3, Plus, Tags,
    Mail, Smartphone, MessageCircle, Coffee, Settings as SettingsIcon
} from 'lucide-react';
import Navbar from '../components/Navbar';
import useDarkMode from '../hooks/useDarkMode';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return null; }
}

function formatSisaToken(token) {
    if (!token) return null;
    const p = decodeJwt(token);
    if (!p?.exp) return null;
    const sisa = p.exp - Math.floor(Date.now() / 1000);
    if (sisa <= 0) return 'Expired';
    if (sisa < 60) return `${sisa} detik`;
    if (sisa < 3600) return `${Math.floor(sisa / 60)} menit`;
    if (sisa < 86400) return `${Math.floor(sisa / 3600)} jam`;
    return `${Math.floor(sisa / 86400)} hari`;
}

function cekKekuatan(pwd) {
    if (!pwd) return { level: 0, label: '', color: '' };
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 12) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^a-zA-Z0-9]/.test(pwd)) s++;
    if (s <= 1) return { level: 1, label: 'Lemah', color: 'bg-red-500' };
    if (s <= 2) return { level: 2, label: 'Cukup', color: 'bg-amber-500' };
    if (s <= 3) return { level: 3, label: 'Baik', color: 'bg-blue-500' };
    return { level: 4, label: 'Kuat', color: 'bg-emerald-500' };
}

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-900 w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl animate-in slide-in-from-bottom flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function Settings() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const currentUser = localStorage.getItem('username');
    const { isDark, toggle } = useDarkMode();

    // ===== STATE PROFIL =====
    const [profil, setProfil] = useState({ namaLengkap: '', email: '', nomorHp: '' });
    const [showProfilModal, setShowProfilModal] = useState(false);
    const [formProfil, setFormProfil] = useState({ namaLengkap: '', email: '', nomorHp: '' });
    const [terimaLaporan, setTerimaLaporan] = useState(false);
    const [isSavingProfil, setIsSavingProfil] = useState(false);
    const [msgProfil, setMsgProfil] = useState(null);

    // State Modals
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [showDompetModal, setShowDompetModal] = useState(false);

    const [dompetHarian, setDompetHarian] = useState([]);
    const [isSavingDompet, setIsSavingDompet] = useState(false);
    const [msgDompet, setMsgDompet] = useState(null);

    const [formPwd, setFormPwd] = useState({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
    const [showPwd, setShowPwd] = useState({ lama: false, baru: false, konfirmasi: false });
    const [isSavingPwd, setIsSavingPwd] = useState(false);
    const [msgPwd, setMsgPwd] = useState(null);
    const kekuatan = cekKekuatan(formPwd.passwordBaru);

    // State Master Aset
    const [listAset, setListAset] = useState([]);
    const [showAsetModal, setShowAsetModal] = useState(false);
    const [showListAsetModal, setShowListAsetModal] = useState(false);
    const [editAset, setEditAset] = useState(null);
    const [inputAset, setInputAset] = useState('');
    const [msgAset, setMsgAset] = useState(null);
    const [isSavingAset, setIsSavingAset] = useState(false);

    // State Master Kategori
    const [listKategori, setListKategori] = useState([]);
    const [showKategoriModal, setShowKategoriModal] = useState(false);
    const [editKategori, setEditKategori] = useState(null);
    const [inputKategori, setInputKategori] = useState('');
    const [msgKategori, setMsgKategori] = useState(null);
    const [isSavingKategori, setIsSavingKategori] = useState(false);
    const [showListKategoriModal, setShowListKategoriModal] = useState(false);

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    useEffect(() => {
        if (!token) return;
        fetchProfil();
        fetchAset();
        fetchKategori();
        fetch(`${baseUrl}/api/user/preferences`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.dompetHarian) setDompetHarian(data.dompetHarian); })
            .catch(() => { });
    }, [token]);

    const fetchProfil = async () => {
        try {
            const res = await fetch(`${baseUrl}/api/user/profile`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                setProfil({
                    namaLengkap: data.namaLengkap || '',
                    email: data.email || '',
                    nomorHp: data.nomorHp || ''
                });
                setTerimaLaporan(data.terimaLaporanBulanan === 'true');
            }
        } catch (e) { console.error('Gagal mengambil data profil', e); }
    };

    const handleBukaProfilModal = () => {
        setFormProfil(profil);
        setShowProfilModal(true);
        setMsgProfil(null);
    };

    const handleSimpanProfil = async (e) => {
        e.preventDefault();
        setIsSavingProfil(true);
        setMsgProfil(null);
        try {
            const payload = {
                ...formProfil,
                terimaLaporanBulanan: terimaLaporan.toString()
            };
            const res = await fetch(`${baseUrl}/api/user/profile`, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setProfil(formProfil);
                setMsgProfil({ text: '✅ Profil berhasil diperbarui!', ok: true });
                setTimeout(() => setShowProfilModal(false), 1500);
            } else {
                const text = await res.text();
                setMsgProfil({ text: `❌ Gagal: ${text}`, ok: false });
            }
        } catch {
            setMsgProfil({ text: '❌ Gagal terhubung ke server', ok: false });
        } finally {
            setIsSavingProfil(false);
        }
    };

    const toggleAset = (aset) => setDompetHarian(prev => prev.includes(aset) ? prev.filter(a => a !== aset) : [...prev, aset]);
    const simpanDompetHarian = async () => {
        setIsSavingDompet(true); setMsgDompet(null);
        try {
            const res = await fetch(`${baseUrl}/api/user/preferences`, {
                method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ dompetHarian })
            });
            setMsgDompet({ text: res.ok ? '✅ Tersimpan!' : '❌ Gagal menyimpan', ok: res.ok });
            if (res.ok) setTimeout(() => { setShowDompetModal(false); setMsgDompet(null); }, 1500);
        } catch { setMsgDompet({ text: '❌ Gagal terhubung ke server', ok: false }); } finally { setIsSavingDompet(false); if (!msgDompet?.ok) setTimeout(() => setMsgDompet(null), 3000); }
    };

    const handleClosePwdModal = () => { setShowPwdModal(false); setFormPwd({ passwordLama: '', passwordBaru: '', konfirmasi: '' }); setMsgPwd(null); };
    const handleGantiPassword = async (e) => {
        e.preventDefault();
        if (formPwd.passwordBaru !== formPwd.konfirmasi) return setMsgPwd({ text: '❌ Konfirmasi password tidak cocok', ok: false });
        if (kekuatan.level < 2) return setMsgPwd({ text: '❌ Password terlalu lemah', ok: false });
        setIsSavingPwd(true); setMsgPwd(null);
        try {
            const res = await fetch(`${baseUrl}/api/user/password`, {
                method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(formPwd)
            });
            const text = await res.text(); let data = null; try { data = JSON.parse(text); } catch { data = null; }
            if (res.ok && data?.token) {
                localStorage.setItem('token', data.token); if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
                setMsgPwd({ text: '✅ Password berhasil diubah!', ok: true }); setTimeout(() => handleClosePwdModal(), 2000);
            } else { setMsgPwd({ text: `❌ ${data?.message || text || 'Gagal mengubah password'}`, ok: false }); }
        } catch { setMsgPwd({ text: '❌ Gagal terhubung ke server', ok: false }); } finally { setIsSavingPwd(false); setTimeout(() => setMsgPwd(null), 4000); }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };
    const fetchAset = async () => { try { const res = await fetch(`${baseUrl}/api/master/aset`, { headers: { 'Authorization': 'Bearer ' + token } }); if (res.ok) setListAset(await res.json()); } catch (e) { console.error(e); } };
    const simpanAset = async () => {
        if (!inputAset.trim()) return setMsgAset({ text: 'Nama aset wajib diisi', ok: false }); setIsSavingAset(true); setMsgAset(null);
        try {
            const res = await fetch(editAset ? `${baseUrl}/api/master/aset/${editAset.id}` : `${baseUrl}/api/master/aset`, {
                method: editAset ? 'PUT' : 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: inputAset.trim() })
            });
            const msg = await res.text();
            if (res.ok) { setMsgAset({ text: editAset ? '✅ Aset diperbarui!' : '✅ Aset ditambahkan!', ok: true }); setInputAset(''); setEditAset(null); fetchAset(); setTimeout(() => setMsgAset(null), 2000); } else { setMsgAset({ text: `❌ ${msg}`, ok: false }); }
        } catch { setMsgAset({ text: '❌ Gagal terhubung', ok: false }); } finally { setIsSavingAset(false); }
    };
    const hapusAset = async (id) => { if (!window.confirm('Yakin ingin menghapus aset ini?')) return; try { const res = await fetch(`${baseUrl}/api/master/aset/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }); if (res.ok) { fetchAset(); } else { alert(await res.text()); } } catch { alert('Gagal menghapus aset'); } };
    const toggleAktifAset = async (aset) => { try { await fetch(`${baseUrl}/api/master/aset/${aset.id}`, { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ isAktif: !aset.isAktif }) }); fetchAset(); } catch { alert('Gagal mengubah status aset'); } };
    const fetchKategori = async () => { try { const res = await fetch(`${baseUrl}/api/master/kategori`, { headers: { 'Authorization': 'Bearer ' + token } }); if (res.ok) setListKategori(await res.json()); } catch (e) { console.error(e); } };
    const simpanKategori = async () => {
        if (!inputKategori.trim()) return setMsgKategori({ text: 'Nama kategori wajib diisi', ok: false }); setIsSavingKategori(true); setMsgKategori(null);
        try {
            const res = await fetch(editKategori ? `${baseUrl}/api/master/kategori/${editKategori.id}` : `${baseUrl}/api/master/kategori`, {
                method: editKategori ? 'PUT' : 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ nama: inputKategori.trim() })
            });
            const msg = await res.text();
            if (res.ok) { setMsgKategori({ text: editKategori ? '✅ Kategori diperbarui!' : '✅ Kategori ditambahkan!', ok: true }); setInputKategori(''); setEditKategori(null); fetchKategori(); setTimeout(() => setMsgKategori(null), 2000); } else { setMsgKategori({ text: `❌ ${msg}`, ok: false }); }
        } catch { setMsgKategori({ text: '❌ Gagal terhubung', ok: false }); } finally { setIsSavingKategori(false); }
    };
    const hapusKategori = async (id) => { if (!window.confirm('Yakin ingin menghapus kategori ini?')) return; try { const res = await fetch(`${baseUrl}/api/master/kategori/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } }); if (res.ok) { fetchKategori(); } else { alert(await res.text()); } } catch { alert('Gagal menghapus kategori'); } };

    if (!token) return null;
    const sisaAkses = formatSisaToken(token); const sisaRefresh = formatSisaToken(refreshToken);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6 relative">
            <Navbar />
            <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

                {/* Header Baru (Sama seperti halaman lainnya) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg text-white shadow-sm">
                            <SettingsIcon size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-50">Pengaturan</h2>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Kelola preferensi akun & aplikasi</p>
                        </div>
                    </div>
                </div>

                {/* ===== BLOK PROFIL & KEAMANAN ===== */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Profil & Keamanan</p>
                        <button onClick={handleBukaProfilModal} className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-xs font-semibold">
                            <Edit3 size={14} /> Edit Profil
                        </button>
                    </div>

                    {/* Info Profil Utama */}
                    <div className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                            <User size={26} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">
                                {profil.namaLengkap || currentUser}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">@{currentUser}</p>

                            <div className="flex flex-col gap-1 mt-2">
                                {profil.email && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <Mail size={12} /> <span className="truncate">{profil.email}</span>
                                    </div>
                                )}
                                {profil.nomorHp && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <Smartphone size={12} /> <span>{profil.nomorHp}</span>
                                    </div>
                                )}
                                {(!profil.email || !profil.nomorHp) && (
                                    <p className="text-xs text-amber-500 mt-1 italic">Lengkapi profil Anda</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tombol Buka Modal Ganti Password */}
                    <div
                        className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => setShowPwdModal(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Lock size={16} className="text-slate-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Password Akun</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Perbarui password secara berkala</p>
                            </div>
                        </div>
                        <button className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                            Ubah
                        </button>
                    </div>
                </div>

                {/* Dompet Harian */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dompet Harian</p>
                        <button onClick={() => setShowDompetModal(true)} className="text-blue-500 hover:text-blue-600 flex items-center gap-1 text-xs font-semibold">
                            <Edit3 size={14} /> Atur
                        </button>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Aset yang sering digunakan untuk transaksi.</p>
                        {dompetHarian.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {dompetHarian.map(a => (
                                    <span key={a} className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full">
                                        <Wallet size={12} className="text-blue-500" />{a}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center">
                                <p className="text-sm text-slate-500">Belum ada dompet yang dipilih.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== BLOK DATA MASTER (ASET & KATEGORI) ===== */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Master</p>
                    </div>

                    {/* Tombol Buka List Master Aset */}
                    <div
                        className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => setShowListAsetModal(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Wallet size={16} className="text-slate-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Master Aset</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{listAset.length} aset tersimpan</p>
                            </div>
                        </div>
                        <button className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                            Kelola
                        </button>
                    </div>

                    {/* Tombol Buka List Master Kategori */}
                    <div
                        className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => setShowListKategoriModal(true)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Tags size={16} className="text-slate-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Master Kategori</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{listKategori.length} kategori tersimpan</p>
                            </div>
                        </div>
                        <button className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                            Kelola
                        </button>
                    </div>
                </div>

                {/* Status Sesi */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status Sesi</p>
                    </div>
                    <div className="px-4 py-4 space-y-3">
                        {[
                            { label: 'Access token', sisa: sisaAkses, icon: <Shield size={14} className="text-emerald-500" /> },
                            { label: 'Refresh token', sisa: sisaRefresh, icon: <Shield size={14} className="text-blue-500" /> },
                        ].map(({ label, sisa, icon }) => (
                            <div key={label} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    {icon}<span>{label}</span>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                                    ${sisa === 'Expired' || !sisa
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                    {sisa ? `Sisa ${sisa}` : 'Tidak ada'}
                                </span>
                            </div>
                        ))}
                        {!refreshToken && (
                            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                                <span>Refresh token tidak ditemukan. Login ulang untuk mendapatkan sesi yang lebih panjang.</span>
                            </div>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">Sesi diperpanjang otomatis selama kamu aktif menggunakan aplikasi.</p>
                    </div>
                </div>

                {/* Tampilan */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tampilan</p>
                    </div>
                    <div className="flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3">
                            {isDark ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-amber-500" />}
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Mode Gelap</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">{isDark ? 'Aktif' : 'Nonaktif'}</p>
                            </div>
                        </div>
                        <button onClick={toggle} className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${isDark ? 'bg-blue-500' : 'bg-slate-300'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Dukung Developer / Donasi */}
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/10 rounded-xl border border-rose-200 dark:border-rose-800/50 overflow-hidden relative shadow-sm">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-rose-500/10 dark:bg-rose-500/20 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="px-4 py-3 border-b border-rose-200/50 dark:border-rose-800/50">
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Coffee size={14} /> Support Developer
                        </p>
                    </div>
                    <div className="p-4 flex flex-col gap-4 relative z-10">
                        <p className="text-sm text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                            Terbantu dengan ZonaKas? Dukung pengembangan aplikasi ini agar tetap gratis dan bebas iklan dengan mentraktir kopi developer! ☕
                        </p>
                        <a
                            href="https://sociabuzz.com/zamagi/tribe"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                            Traktir Kopi (SociaBuzz)
                        </a>
                    </div>
                </div>

                {/* Komunitas */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Komunitas</p>
                    </div>
                    <a
                        href="https://chat.whatsapp.com/LMDRdWKeLOO2B8xtN2DuEO"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors block"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                <MessageCircle size={16} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Channel WhatsApp</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">Update terbaru & sharing</p>
                            </div>
                        </div>
                        <div className="text-xs font-bold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 transition-colors">
                            Gabung
                        </div>
                    </a>
                </div>

                {/* Tentang */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tentang</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                        <Info size={20} className="text-slate-400" />
                        <div>
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">ZonaKas</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Aplikasi pencatatan keuangan pribadi</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3">
                            <Info size={20} className="text-slate-400" />
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Versi</p>
                            </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">2.0.0</p>
                    </div>
                </div>

                {/* Logout */}
                <button onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-slate-900 text-red-500 font-bold rounded-xl border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition shadow-sm">
                    <LogOut size={18} /> Logout Akun
                </button>

            </div>

            {/* ===== MODAL ===== */}

            {/* MODAL: Edit Profil */}
            <Modal isOpen={showProfilModal} onClose={() => setShowProfilModal(false)} title="Edit Profil">
                <form onSubmit={handleSimpanProfil} className="space-y-4">
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Nama Lengkap</label>
                            <input type="text"
                                value={formProfil.namaLengkap}
                                onChange={e => setFormProfil({ ...formProfil, namaLengkap: e.target.value })}
                                className="w-full mt-1 px-4 py-3 text-sm rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Masukkan nama lengkap" required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Email</label>
                            <input type="email"
                                value={formProfil.email}
                                onChange={e => setFormProfil({ ...formProfil, email: e.target.value })}
                                className="w-full mt-1 px-4 py-3 text-sm rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="contoh@email.com"
                            />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <h4 className="font-medium text-slate-800 dark:text-slate-100">Laporan Bulanan</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Kirim ringkasan transaksi ke email setiap awal bulan.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={terimaLaporan}
                                    onChange={(e) => setTerimaLaporan(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                            </label>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Nomor Handphone</label>
                            <input type="tel"
                                value={formProfil.nomorHp}
                                onChange={e => setFormProfil({ ...formProfil, nomorHp: e.target.value })}
                                className="w-full mt-1 px-4 py-3 text-sm rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="081234567890"
                            />
                        </div>
                    </div>

                    {msgProfil && (
                        <p className={`text-sm font-medium text-center p-2 rounded-lg ${msgProfil.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {msgProfil.text}
                        </p>
                    )}

                    <div className="pt-2">
                        <button type="submit" disabled={isSavingProfil} className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                            {isSavingProfil ? 'Menyimpan...' : 'Simpan Profil'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: Ganti Password */}
            <Modal isOpen={showPwdModal} onClose={handleClosePwdModal} title="Ganti Password">
                <form onSubmit={handleGantiPassword} className="space-y-4">
                    {[
                        { key: 'lama', field: 'passwordLama', placeholder: 'Password lama' },
                        { key: 'baru', field: 'passwordBaru', placeholder: 'Password baru (min. 8 karakter)' },
                        { key: 'konfirmasi', field: 'konfirmasi', placeholder: 'Ulangi password baru' },
                    ].map(({ key, field, placeholder }) => (
                        <div key={field} className="relative">
                            <input
                                type={showPwd[key] ? 'text' : 'password'}
                                placeholder={placeholder}
                                value={formPwd[field]}
                                onChange={e => setFormPwd(p => ({ ...p, [field]: e.target.value }))}
                                className={`w-full px-4 py-3 pr-10 text-sm rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow
                                    ${field === 'konfirmasi' && formPwd.konfirmasi && formPwd.passwordBaru !== formPwd.konfirmasi
                                        ? 'border-red-400 focus:ring-red-500'
                                        : 'border-slate-200 dark:border-slate-700'}`}
                                required
                            />
                            <button type="button"
                                onClick={() => setShowPwd(p => ({ ...p, [key]: !p[key] }))}
                                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                {showPwd[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            {field === 'konfirmasi' && formPwd.konfirmasi && formPwd.passwordBaru === formPwd.konfirmasi && (
                                <Check size={16} className="absolute right-10 top-3.5 text-emerald-500" />
                            )}
                        </div>
                    ))}

                    {/* Indikator kekuatan */}
                    {formPwd.passwordBaru && (
                        <div className="space-y-1.5 pt-1">
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= kekuatan.level ? kekuatan.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">
                                Kekuatan: <span className="font-semibold">{kekuatan.label}</span>
                                {kekuatan.level < 3 && <span className="text-amber-500 ml-1">— tambah huruf besar/simbol</span>}
                            </p>
                        </div>
                    )}

                    <div className="pt-2">
                        <button type="submit" disabled={isSavingPwd}
                            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                            {isSavingPwd ? 'Menyimpan...' : 'Simpan Password Baru'}
                        </button>
                    </div>
                    {msgPwd && (
                        <p className={`text-sm font-medium text-center p-2 rounded-lg ${msgPwd.ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                            {msgPwd.text}
                        </p>
                    )}
                </form>
            </Modal>

            {/* MODAL: Dompet Harian */}
            <Modal isOpen={showDompetModal} onClose={() => setShowDompetModal(false)} title="Pilih Dompet Harian">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tentukan aset yang sering digunakan agar mudah diakses saat mencatat transaksi.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {listAset.filter(a => a.isAktif).length === 0 ? (
                            <p className="text-sm text-slate-500 italic col-span-2 text-center py-4">
                                Belum ada aset yang aktif. Silakan tambah di Master Aset terlebih dahulu.
                            </p>
                        ) : (
                            listAset.filter(a => a.isAktif).map(asetObj => {
                                const namaAset = asetObj.nama;
                                const dipilih = dompetHarian.includes(namaAset);
                                return (
                                    <button key={asetObj.id} onClick={() => toggleAset(namaAset)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all
                                            ${dipilih
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'}`}>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-all ${dipilih ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {dipilih && <Check size={14} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <span className="leading-tight">{namaAset}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="pt-2">
                        <button onClick={simpanDompetHarian} disabled={isSavingDompet}
                            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors shadow-sm">
                            {isSavingDompet ? 'Menyimpan...' : 'Terapkan Dompet'}
                        </button>
                    </div>
                    {msgDompet && (
                        <p className={`text-sm font-medium text-center p-2 rounded-lg ${msgDompet.ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                            {msgDompet.text}
                        </p>
                    )}
                </div>
            </Modal>

            {/* MODAL: List Semua Aset */}
            <Modal isOpen={showListAsetModal} onClose={() => setShowListAsetModal(false)} title="Kelola Aset">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total: {listAset.length} data</p>
                        <button
                            onClick={() => { setShowAsetModal(true); setEditAset(null); setInputAset(''); setMsgAset(null); }}
                            className="flex items-center gap-1.5 text-sm font-semibold bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition"
                        >
                            <Plus size={16} /> Tambah Baru
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[50vh] overflow-y-auto pr-1">
                        {listAset.length === 0 ? (
                            <p className="py-8 text-sm text-slate-400 dark:text-slate-500 text-center">Belum ada aset. Tambahkan dulu.</p>
                        ) : listAset.map(aset => (
                            <div key={aset.id} className="flex items-center justify-between py-3 gap-3">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Wallet size={16} className={aset.isAktif ? 'text-blue-500' : 'text-slate-300 dark:text-slate-600'} />
                                    <span className={`text-sm font-medium truncate ${aset.isAktif ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600 line-through'}`}>
                                        {aset.nama}
                                    </span>
                                    {!aset.isAktif && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">Nonaktif</span>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => toggleAktifAset(aset)}
                                        className={`text-xs px-2 py-1 rounded-lg font-semibold transition ${aset.isAktif ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100'}`}>
                                        {aset.isAktif ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <button onClick={() => { setEditAset(aset); setInputAset(aset.nama); setShowAsetModal(true); setMsgAset(null); }}
                                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition">
                                        <Edit3 size={14} />
                                    </button>
                                    <button onClick={() => hapusAset(aset.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* MODAL: List Semua Kategori */}
            <Modal isOpen={showListKategoriModal} onClose={() => setShowListKategoriModal(false)} title="Kelola Kategori">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total: {listKategori.length} data</p>
                        <button
                            onClick={() => { setShowKategoriModal(true); setEditKategori(null); setInputKategori(''); setMsgKategori(null); }}
                            className="flex items-center gap-1.5 text-sm font-semibold bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition"
                        >
                            <Plus size={16} /> Tambah Baru
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[50vh] overflow-y-auto pr-1">
                        {listKategori.length === 0 ? (
                            <p className="py-8 text-sm text-slate-400 dark:text-slate-500 text-center">Belum ada kategori yang ditambahkan.</p>
                        ) : listKategori.map(kat => (
                            <div key={kat.id} className="flex items-center justify-between py-3 gap-3">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1 truncate">{kat.nama}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => { setEditKategori(kat); setInputKategori(kat.nama); setShowKategoriModal(true); setMsgKategori(null); }}
                                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition">
                                        <Edit3 size={14} />
                                    </button>
                                    <button onClick={() => hapusKategori(kat.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* MODAL: Tambah/Edit Aset */}
            <Modal isOpen={showAsetModal} onClose={() => setShowAsetModal(false)}
                title={editAset ? 'Edit Aset' : 'Tambah Aset Baru'}>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Nama aset, misal: BCA, GoPay, Dompet Tunai"
                        value={inputAset}
                        onChange={e => setInputAset(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && simpanAset()}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    {msgAset && (
                        <p className={`text-sm font-medium text-center p-2 rounded-lg ${msgAset.ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                            {msgAset.text}
                        </p>
                    )}
                    <button onClick={simpanAset} disabled={isSavingAset}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition">
                        {isSavingAset ? 'Menyimpan...' : (editAset ? 'Simpan Perubahan' : 'Tambah Aset')}
                    </button>
                </div>
            </Modal>

            {/* MODAL: Tambah/Edit Kategori */}
            <Modal isOpen={showKategoriModal} onClose={() => setShowKategoriModal(false)}
                title={editKategori ? 'Edit Kategori' : 'Tambah Kategori Baru'}>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Nama kategori, misal: Makan & Minum, Transportasi"
                        value={inputKategori}
                        onChange={e => setInputKategori(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && simpanKategori()}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    {msgKategori && (
                        <p className={`text-sm font-medium text-center p-2 rounded-lg ${msgKategori.ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                            {msgKategori.text}
                        </p>
                    )}
                    <button onClick={simpanKategori} disabled={isSavingKategori}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition">
                        {isSavingKategori ? 'Menyimpan...' : (editKategori ? 'Simpan Perubahan' : 'Tambah Kategori')}
                    </button>
                </div>
            </Modal>

        </div>
    );
}