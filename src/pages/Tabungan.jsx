import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiggyBank, Plus, X, Edit3, Trash2, Target, Calendar, CheckCircle, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
const API_URL = `${baseUrl}/api/tabungan`;

export default function Tabungan() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [tabunganList, setTabunganList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State Form menggunakan string agar bisa diformat ribuan
    const [formData, setFormData] = useState({
        nama: '',
        targetNominal: '',
        terkumpul: '',
        deadline: ''
    });

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    // Pemisah ribuan saat ngetik
    const formatInput = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers ? new Intl.NumberFormat('id-ID').format(numbers) : '';
    };

    useEffect(() => {
        if (!token) navigate('/');
        fetchTabungan();
    }, [token, navigate]);

    const fetchTabungan = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_URL, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                setTabunganList(data);
            } else {
                useMockData();
            }
        } catch (err) {
            useMockData();
        } finally {
            setIsLoading(false);
        }
    };

    // Data Mockup (Sementara jika backend belum ready)
    const useMockData = () => {
        if (tabunganList.length === 0) {
            setTabunganList([
                { id: 1, nama: 'Liburan ke Bali', targetNominal: 5000000, terkumpul: 2000000, deadline: '2026-12-30' },
                { id: 2, nama: 'Dana Darurat', targetNominal: 20000000, terkumpul: 20000000, deadline: '2027-01-01' },
            ]);
        }
    };

    const handleSimpan = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            nama: formData.nama,
            targetNominal: parseInt(formData.targetNominal.replace(/\D/g, '')) || 0,
            terkumpul: parseInt(formData.terkumpul.replace(/\D/g, '')) || 0,
            deadline: formData.deadline
        };

        try {
            const url = editItem ? `${API_URL}/${editItem.id}` : API_URL;
            const method = editItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchTabungan();
            } else {
                // FALLBACK LOKAL MOCK (Hapus block ini jika API sudah benar-benar jalan)
                if (editItem) {
                    setTabunganList(prev => prev.map(t => t.id === editItem.id ? { ...t, ...payload } : t));
                } else {
                    setTabunganList([...tabunganList, { id: Date.now(), ...payload }]);
                }
                setShowModal(false);
                resetForm();
            }
        } catch {
            alert('Gagal menyimpan target tabungan');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHapus = async (id) => {
        if (!window.confirm('Yakin ingin menghapus target tabungan ini?')) return;
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            // Hapus lokal state (berlaku untuk API maupun Mock)
            setTabunganList(prev => prev.filter(t => t.id !== id));
        } catch {
            alert('Gagal menghapus');
        }
    };

    const resetForm = () => {
        setFormData({ nama: '', targetNominal: '', terkumpul: '', deadline: '' });
        setEditItem(null);
    };

    const bukaEdit = (item) => {
        setFormData({
            nama: item.nama,
            targetNominal: formatInput(item.targetNominal.toString()),
            terkumpul: formatInput(item.terkumpul.toString()),
            deadline: item.deadline || ''
        });
        setEditItem(item);
        setShowModal(true);
    };

    const hitungSisaHari = (deadlineDate) => {
        if (!deadlineDate) return '-';
        const today = new Date();
        const deadline = new Date(deadlineDate);
        const diffTime = deadline - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? `${diffDays} hari lagi` : 'Telah Berakhir';
    };

    // Hitung Summary
    const totalTarget = tabunganList.reduce((acc, t) => acc + t.targetNominal, 0);
    const totalTerkumpul = tabunganList.reduce((acc, t) => acc + t.terkumpul, 0);
    const totalTercapai = tabunganList.filter(t => t.terkumpul >= t.targetNominal).length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2">
                            <PiggyBank className="text-pink-500" /> Target Tabungan
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Pantau progress mimpimu di sini.</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition shadow-sm"
                    >
                        <Plus size={16} /> Tambah Target
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Total Target</p>
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{formatRp(totalTarget)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Terkumpul</p>
                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">{formatRp(totalTerkumpul)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-blue-400 dark:text-blue-500 uppercase mb-1.5">Tercapai</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {totalTercapai} / {tabunganList.length} Target
                        </p>
                    </div>
                </div>

                {/* List Tabungan */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : tabunganList.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                        <PiggyBank size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Belum ada target tabungan</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Klik "Tambah Target" untuk mulai menabung</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tabunganList.map(tabungan => {
                            const progress = tabungan.targetNominal > 0 ? Math.min(100, (tabungan.terkumpul / tabungan.targetNominal) * 100) : 0;
                            const isCompleted = progress >= 100;

                            return (
                                <div key={tabungan.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${isCompleted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-pink-100 text-pink-600 dark:bg-pink-900/30'}`}>
                                                {isCompleted ? <CheckCircle size={24} /> : <Target size={24} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100">{tabungan.nama}</h3>
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                                    <Calendar size={12} /> {hitungSisaHari(tabungan.deadline)}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Aksi Edit/Delete */}
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => bukaEdit(tabungan)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={() => handleHapus(tabungan.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Nominal Info */}
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{formatRp(tabungan.terkumpul)}</span>
                                        <span className="text-slate-500 dark:text-slate-500 text-xs mt-0.5">dari {formatRp(tabungan.targetNominal)}</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700/50">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-rose-500'}`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>

                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-slate-400 dark:text-slate-500">
                                            Sisa: {formatRp(Math.max(0, tabungan.targetNominal - tabungan.terkumpul))}
                                        </span>
                                        <p className={`text-xs font-bold ${isCompleted ? 'text-emerald-500' : 'text-pink-500'}`}>
                                            {progress.toFixed(1)}%
                                        </p>
                                    </div>

                                    {/* [!] TAMBAHKAN INI UNTUK MENAMPILKAN UPDATED AT */}
                                    {tabungan.updatedAt && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-400">
                                            <Clock size={12} />
                                            Diperbarui: {new Date(tabungan.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit Target Tabungan */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-700/70 bg-white dark:bg-slate-950 shadow-2xl">

                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Atur mimpimu</p>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {editItem ? 'Edit Tabungan' : 'Tambah Tabungan Baru'}
                                </h3>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSimpan} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Nama Tabungan</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Liburan ke Jepang"
                                    value={formData.nama}
                                    onChange={e => setFormData(p => ({ ...p, nama: e.target.value }))}
                                    className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Target (Rp)</label>
                                    <input
                                        type="text"
                                        required
                                        inputMode="numeric"
                                        placeholder="5.000.000"
                                        value={formData.targetNominal}
                                        onChange={e => setFormData(p => ({ ...p, targetNominal: formatInput(e.target.value) }))}
                                        className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 font-bold text-pink-600 dark:text-pink-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Terkumpul (Rp)</label>
                                    <input
                                        type="text"
                                        required
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={formData.terkumpul}
                                        onChange={e => setFormData(p => ({ ...p, terkumpul: formatInput(e.target.value) }))}
                                        className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 font-bold text-emerald-600 dark:text-emerald-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Target Selesai (Deadline)</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.deadline}
                                    onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
                                    className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : (editItem ? 'Simpan Perubahan' : 'Buat Target')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}