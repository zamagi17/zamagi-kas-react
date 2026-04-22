import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, AlertTriangle, CheckCircle, TrendingUp, Edit3, Trash2, Target } from 'lucide-react';
import Navbar from '../components/Navbar';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');

export default function Budget() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [filterBulan, setFilterBulan] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [budgets, setBudgets] = useState([]);
    const [realisasi, setRealisasi] = useState({});
    const [masterKategori, setMasterKategori] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        kategori: '',
        limitBulan: '',
        catatan: ''
    });

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    const formatInput = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers ? new Intl.NumberFormat('id-ID').format(numbers) : '';
    };

    // Fetch kategori
    useEffect(() => {
        if (!token) return;
        fetch(`${baseUrl}/api/master/kategori`, {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(res => res.ok ? res.json() : [])
            .then(data => setMasterKategori(data))
            .catch(() => { });
    }, [token]);

    // Fetch budgets & realisasi
    const fetchAll = async () => {
        setIsLoading(true);
        try {
            // Fetch budgets
            const resBudget = await fetch(`${baseUrl}/api/budget?bulan=${filterBulan}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (resBudget.status === 401) { localStorage.clear(); navigate('/'); return; }
            const budgetData = resBudget.ok ? await resBudget.json() : [];
            setBudgets(budgetData);

            // Fetch transaksi untuk hitung realisasi
            const resTrx = await fetch(`${baseUrl}/api/transaksi`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (resTrx.ok) {
                const trxData = await resTrx.json();
                const [fYear, fMonth] = filterBulan.split('-');
                const realisasiMap = {};

                trxData.forEach(row => {
                    const rowDate = new Date(row.tanggal);
                    const rYear = rowDate.getFullYear().toString();
                    const rMonth = (rowDate.getMonth() + 1).toString().padStart(2, '0');

                    if (rYear === fYear && rMonth === fMonth && row.jenis === 'Pengeluaran') {
                        const kat = row.kategori || 'Lain-lain';
                        realisasiMap[kat] = (realisasiMap[kat] || 0) + (row.nominal || 0);
                    }
                });
                setRealisasi(realisasiMap);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);
    useEffect(() => { if (token) fetchAll(); }, [filterBulan, token]);

    const handleSimpan = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = {
            kategori: formData.kategori,
            limitBulan: parseInt(formData.limitBulan.replace(/\D/g, '')) || 0,
            bulan: filterBulan,
            catatan: formData.catatan
        };

        try {
            const url = editItem
                ? `${baseUrl}/api/budget/${editItem.id}`
                : `${baseUrl}/api/budget`;
            const method = editItem ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchAll();
            } else {
                alert(await res.text());
            }
        } catch {
            alert('Gagal menyimpan');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleHapus = async (id) => {
        if (!window.confirm('Yakin ingin menghapus budget ini?')) return;
        try {
            await fetch(`${baseUrl}/api/budget/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            fetchAll();
        } catch { alert('Gagal menghapus'); }
    };

    const resetForm = () => {
        setFormData({ kategori: '', limitBulan: '', catatan: '' });
        setEditItem(null);
    };

    const bukaEdit = (item) => {
        setFormData({
            kategori: item.kategori,
            limitBulan: formatInput(item.limitBulan.toString()),
            catatan: item.catatan || ''
        });
        setEditItem(item);
        setShowModal(true);
    };

    // Hitung summary
    const totalLimit = budgets.reduce((acc, b) => acc + b.limitBulan, 0);
    const totalRealisasi = budgets.reduce((acc, b) => acc + (realisasi[b.kategori] || 0), 0);
    const overCount = budgets.filter(b => (realisasi[b.kategori] || 0) > b.limitBulan).length;
    const warningCount = budgets.filter(b => {
        const r = realisasi[b.kategori] || 0;
        const persen = b.limitBulan > 0 ? (r / b.limitBulan) * 100 : 0;
        return persen >= 80 && persen <= 100;
    }).length;

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-50">Budget & Anggaran</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Atur batas pengeluaran per kategori</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="month"
                            value={filterBulan}
                            onChange={e => setFilterBulan(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition shadow-sm"
                        >
                            <Plus size={16} /> Tambah
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Total Limit</p>
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{formatRp(totalLimit)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Terpakai</p>
                        <p className="text-base font-bold text-blue-600 dark:text-blue-400 truncate">{formatRp(totalRealisasi)}</p>
                    </div>
                    <div className={`rounded-xl border p-4 shadow-sm ${overCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : warningCount > 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'}`}>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Status</p>
                        <p className={`text-sm font-bold ${overCount > 0 ? 'text-red-600 dark:text-red-400' : warningCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {overCount > 0 ? `${overCount} Over` : warningCount > 0 ? `${warningCount} Hampir` : '✓ Aman'}
                        </p>
                    </div>
                </div>

                {/* Alert Over Budget */}
                {overCount > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-700 dark:text-red-300 text-sm">⚠️ Over Budget!</p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                {overCount} kategori telah melewati batas anggaran bulan ini.
                            </p>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : budgets.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                        <Target size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="font-semibold text-slate-500 dark:text-slate-400">Belum ada budget</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Klik "Tambah" untuk membuat anggaran kategori</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {budgets.map(item => {
                            const terpakai = realisasi[item.kategori] || 0;
                            const persen = item.limitBulan > 0 ? Math.min((terpakai / item.limitBulan) * 100, 100) : 0;
                            const isOver = terpakai > item.limitBulan;
                            const isWarning = !isOver && persen >= 80;
                            const sisa = item.limitBulan - terpakai;

                            let barColor = 'bg-emerald-500';
                            let borderColor = 'border-slate-200 dark:border-slate-700';
                            let bgColor = 'bg-white dark:bg-slate-900';

                            if (isOver) {
                                barColor = 'bg-red-500';
                                borderColor = 'border-red-300 dark:border-red-800';
                                bgColor = 'bg-red-50/50 dark:bg-red-900/10';
                            } else if (isWarning) {
                                barColor = 'bg-amber-500';
                                borderColor = 'border-amber-300 dark:border-amber-800';
                                bgColor = 'bg-amber-50/50 dark:bg-amber-900/10';
                            }

                            return (
                                <div key={item.id} className={`${bgColor} rounded-xl border ${borderColor} p-4 shadow-sm transition`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            {isOver ? (
                                                <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                            ) : isWarning ? (
                                                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                                            ) : (
                                                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                                            )}
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{item.kategori}</span>
                                            {isOver && (
                                                <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                                                    OVER
                                                </span>
                                            )}
                                            {isWarning && (
                                                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                                    ⚠️ {Math.round(persen)}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => bukaEdit(item)}
                                                className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition">
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={() => handleHapus(item.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-2">
                                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                            <span>
                                                Terpakai: <b className={isOver ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}>
                                                    {formatRp(terpakai)}
                                                </b>
                                            </span>
                                            <span>Limit: <b>{formatRp(item.limitBulan)}</b></span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-500 ${barColor} ${isOver ? 'animate-pulse' : ''}`}
                                                style={{ width: `${isOver ? 100 : persen}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-semibold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {isOver
                                                ? `🚨 Melebihi ${formatRp(Math.abs(sisa))}`
                                                : `Sisa: ${formatRp(sisa)}`}
                                        </span>
                                        <span className={`text-xs font-bold ${isOver ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {Math.round(isOver ? (terpakai / item.limitBulan) * 100 : persen)}%
                                        </span>
                                    </div>

                                    {item.catatan && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic">{item.catatan}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Kategori tanpa budget */}
                {!isLoading && Object.keys(realisasi).filter(kat =>
                    !budgets.some(b => b.kategori === kat) && realisasi[kat] > 0
                ).length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3">
                            Pengeluaran Tanpa Anggaran
                        </p>
                        <div className="space-y-2">
                            {Object.entries(realisasi)
                                .filter(([kat]) => !budgets.some(b => b.kategori === kat))
                                .map(([kat, nom]) => (
                                    <div key={kat} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                        <span className="text-slate-600 dark:text-slate-300">{kat}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{formatRp(nom)}</span>
                                            <button
                                                onClick={() => { setFormData({ kategori: kat, limitBulan: '', catatan: '' }); setShowModal(true); }}
                                                className="text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded hover:bg-blue-100 transition"
                                            >
                                                + Atur Budget
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tambah/Edit Budget */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-700/70 bg-white dark:bg-slate-950 shadow-2xl">

                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Atur batas pengeluaran</p>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {editItem ? 'Edit Budget' : 'Tambah Budget'}
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
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Kategori</label>
                                <select
                                    required
                                    value={formData.kategori}
                                    onChange={e => setFormData(p => ({ ...p, kategori: e.target.value }))}
                                    className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                    disabled={!!editItem}
                                >
                                    <option value="">-- Pilih Kategori --</option>
                                    {masterKategori
                                        .filter(k => editItem || !budgets.some(b => b.kategori === k.nama))
                                        .map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Limit per Bulan (Rp)</label>
                                <input
                                    type="text"
                                    required
                                    inputMode="numeric"
                                    placeholder="Contoh: 1.500.000"
                                    value={formData.limitBulan}
                                    onChange={e => setFormData(p => ({ ...p, limitBulan: formatInput(e.target.value) }))}
                                    className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 font-bold text-blue-600 dark:text-blue-400"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                                    Catatan <span className="font-normal text-slate-400">(opsional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Misal: Termasuk makan siang"
                                    value={formData.catatan}
                                    onChange={e => setFormData(p => ({ ...p, catatan: e.target.value }))}
                                    className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : (editItem ? 'Simpan Perubahan' : 'Buat Budget')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
