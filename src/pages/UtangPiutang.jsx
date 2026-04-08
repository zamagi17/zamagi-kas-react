import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Wallet, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '../components/Navbar';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
const API_URL = `${baseUrl}/api/utang-piutang`;

const LIST_ASET = [
    'BCA', 'SeaBank', 'Bank Jago', 'Bank BRI', 'Dompet Tunai',
    'e-Wallet (Gopay/OVO/Dana)', 'Bank RDN', 'Reksa Dana', 'Emas/Logam Mulia'
];

export default function UtangPiutang() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterJenis, setFilterJenis] = useState('Semua');
    const [filterStatus, setFilterStatus] = useState('Belum Lunas');
    const [expandedId, setExpandedId] = useState(null);

    // Modal tambah baru
    const [showModalTambah, setShowModalTambah] = useState(false);
    const [formTambah, setFormTambah] = useState({
        jenis: 'Utang', namaPihak: '', nominalAwal: '',
        asetTerkait: '', tanggalMulai: new Date().toISOString().split('T')[0],
        jatuhTempo: '', keterangan: ''
    });

    // Modal bayar cicilan
    const [showModalBayar, setShowModalBayar] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [formBayar, setFormBayar] = useState({
        nominalBayar: '', asetBayar: '', keterangan: ''
    });

    // Modal lunas
    const [showModalLunas, setShowModalLunas] = useState(false);
    const [asetLunas, setAsetLunas] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    const formatNumberInput = (value) => {
        if (!value && value !== 0) return '';
        const numbers = value.toString().replace(/\D/g, '');
        return numbers ? new Intl.NumberFormat('id-ID').format(numbers) : '';
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_URL, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) { localStorage.clear(); navigate('/'); return; }
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);
    useEffect(() => { fetchData(); }, [token]);

    // Filter data
    const dataFiltered = data.filter(d => {
        const cocokJenis = filterJenis === 'Semua' || d.jenis === filterJenis;
        const cocokStatus = filterStatus === 'Semua' || d.status === filterStatus;
        return cocokJenis && cocokStatus;
    });

    // Summary
    const totalPiutang = data
        .filter(d => d.jenis === 'Piutang' && d.status === 'Belum Lunas')
        .reduce((acc, d) => acc + d.sisaTagihan, 0);
    const totalUtang = data
        .filter(d => d.jenis === 'Utang' && d.status === 'Belum Lunas')
        .reduce((acc, d) => acc + d.sisaTagihan, 0);

    // Cek jatuh tempo
    const getStatusJatuhTempo = (item) => {
        if (!item.jatuhTempo || item.status === 'Lunas') return null;
        const today = new Date();
        const jatuhTempo = new Date(item.jatuhTempo);
        const selisihHari = Math.ceil((jatuhTempo - today) / (1000 * 60 * 60 * 24));
        if (selisihHari < 0) return { label: `Lewat ${Math.abs(selisihHari)} hari`, warna: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' };
        if (selisihHari <= 7) return { label: `${selisihHari} hari lagi`, warna: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' };
        return { label: `${selisihHari} hari lagi`, warna: 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800' };
    };

    // Handle tambah baru
    const handleTambah = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formTambah,
                nominalAwal: parseInt(formTambah.nominalAwal.replace(/\D/g, '')) || 0,
                jatuhTempo: formTambah.jatuhTempo || null
            };
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(payload)
            });
            if (!res.ok) { const msg = await res.text(); alert(msg); return; }
            setShowModalTambah(false);
            setFormTambah({
                jenis: 'Utang', namaPihak: '', nominalAwal: '',
                asetTerkait: '', tanggalMulai: new Date().toISOString().split('T')[0],
                jatuhTempo: '', keterangan: ''
            });
            fetchData();
        } catch (err) {
            alert("Terjadi kesalahan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle bayar cicilan
    const handleBayar = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                nominalBayar: parseInt(formBayar.nominalBayar.replace(/\D/g, '')) || 0,
                asetBayar: formBayar.asetBayar,
                keterangan: formBayar.keterangan
            };
            const res = await fetch(`${API_URL}/${selectedItem.id}/bayar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(payload)
            });
            if (!res.ok) { const msg = await res.text(); alert(msg); return; }
            setShowModalBayar(false);
            setFormBayar({ nominalBayar: '', asetBayar: '', keterangan: '' });
            fetchData();
        } catch (err) {
            alert("Terjadi kesalahan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle tandai lunas
    const handleLunas = async () => {
        if (!asetLunas) { alert("Pilih aset untuk pelunasan"); return; }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/${selectedItem.id}/lunas`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ asetBayar: asetLunas })
            });
            if (!res.ok) { const msg = await res.text(); alert(msg); return; }
            setShowModalLunas(false);
            setAsetLunas('');
            fetchData();
        } catch (err) {
            alert("Terjadi kesalahan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle hapus
    const handleHapus = async (id) => {
        if (!window.confirm("Yakin ingin menghapus data ini? Transaksi terkait tidak ikut terhapus.")) return;
        await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        fetchData();
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Utang Piutang</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Kelola utang & piutang kamu</p>
                    </div>
                    <button
                        onClick={() => setShowModalTambah(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition shadow-sm"
                    >
                        <Plus size={18} /> Catat Baru
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Total Piutang Aktif</p>
                        <p className="text-lg font-bold text-emerald-600">{formatRp(totalPiutang)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Uang yang belum kembali</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Total Utang Aktif</p>
                        <p className="text-lg font-bold text-red-600">{formatRp(totalUtang)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Uang yang harus dibayar</p>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 flex-wrap">
                    {['Semua', 'Piutang', 'Utang'].map(j => (
                        <button key={j} onClick={() => setFilterJenis(j)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition
                                ${filterJenis === j ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            {j}
                        </button>
                    ))}
                    <div className="w-px bg-slate-200 mx-1" />
                    {['Belum Lunas', 'Lunas', 'Semua'].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition
                                ${filterStatus === s ? 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            {s}
                        </button>
                    ))}
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : dataFiltered.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center text-slate-400 dark:text-slate-500">
                        <p className="text-3xl mb-2">📭</p>
                        <p className="font-semibold">Belum ada data</p>
                        <p className="text-sm mt-1">Klik "Catat Baru" untuk menambahkan</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dataFiltered.map(item => {
                            const statusJT = getStatusJatuhTempo(item);
                            const isExpanded = expandedId === item.id;
                            const progress = item.nominalAwal > 0
                                ? Math.round((item.sudahDibayar / item.nominalAwal) * 100)
                                : 0;
                            const isLunas = item.status === 'Lunas';

                            return (
                                <div key={item.id} className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden transition
                                    ${isLunas ? 'border-emerald-200 dark:border-emerald-800' : item.jenis === 'Piutang' ? 'border-blue-200 dark:border-blue-800' : 'border-red-200 dark:border-red-800'}`}>

                                    {/* Header Card */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {/* Badge jenis */}
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0
                                                    ${isLunas ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                        : item.jenis === 'Piutang' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                                                    {isLunas ? '✓ Lunas' : item.jenis}
                                                </span>
                                                <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.namaPihak}</span>
                                            </div>
                                            <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </div>

                                        {/* Nominal & Progress */}
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                <span>Sisa: <b className={isLunas ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}>
                                                    {formatRp(item.sisaTagihan)}
                                                </b></span>
                                                <span>Total: {formatRp(item.nominalAwal)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${isLunas ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-blue-400 dark:bg-blue-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">{progress}% terbayar</p>
                                        </div>

                                        {/* Jatuh tempo */}
                                        {statusJT && (
                                            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${statusJT.warna}`}>
                                                <Clock size={12} /> Jatuh tempo: {statusJT.label}
                                            </div>
                                        )}
                                    </div>

                                    {/* Detail (expanded) */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 px-4 py-3 space-y-2 text-sm bg-slate-50 dark:bg-slate-950">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Aset Terkait</span>
                                                <span className="font-medium dark:text-slate-100">{item.asetTerkait}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Tanggal Mulai</span>
                                                <span className="font-medium dark:text-slate-100">
                                                    {new Date(item.tanggalMulai).toLocaleDateString('id-ID')}
                                                </span>
                                            </div>
                                            {item.jatuhTempo && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500 dark:text-slate-400">Jatuh Tempo</span>
                                                    <span className="font-medium dark:text-slate-100">
                                                        {new Date(item.jatuhTempo).toLocaleDateString('id-ID')}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 dark:text-slate-400">Sudah Dibayar</span>
                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatRp(item.sudahDibayar)}</span>
                                            </div>
                                            {item.keterangan && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500 dark:text-slate-400">Keterangan</span>
                                                    <span className="font-medium dark:text-slate-100 text-right max-w-[60%]">{item.keterangan}</span>
                                                </div>
                                            )}

                                            {/* Tombol Aksi */}
                                            {!isLunas && (
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setFormBayar({ nominalBayar: '', asetBayar: item.asetTerkait, keterangan: '' });
                                                            setShowModalBayar(true);
                                                        }}
                                                        className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition">
                                                        💸 Bayar Cicilan
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setAsetLunas(item.asetTerkait);
                                                            setShowModalLunas(true);
                                                        }}
                                                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition">
                                                        ✓ Tandai Lunas
                                                    </button>
                                                    <button
                                                        onClick={() => handleHapus(item.id)}
                                                        className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-500 dark:text-red-400 text-xs font-bold rounded-lg transition">
                                                        Hapus
                                                    </button>
                                                </div>
                                            )}
                                            {isLunas && (
                                                <div className="flex justify-end pt-2">
                                                    <button
                                                        onClick={() => handleHapus(item.id)}
                                                        className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-500 dark:text-red-400 text-xs font-bold rounded-lg transition">
                                                        Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ===== MODAL TAMBAH BARU ===== */}
            {showModalTambah && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-5 border-b">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Catat Utang / Piutang</h3>
                            <button onClick={() => setShowModalTambah(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleTambah} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Jenis</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Utang', 'Piutang'].map(j => (
                                        <button key={j} type="button"
                                            onClick={() => setFormTambah(p => ({ ...p, jenis: j }))}
                                            className={`py-2.5 rounded-lg font-bold text-sm border transition
                                                ${formTambah.jenis === j
                                                    ? j === 'Utang' ? 'bg-red-500 text-white border-red-500' : 'bg-blue-500 text-white border-blue-500'
                                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600'}`}>
                                            {j === 'Utang' ? '🔴 Utang (saya ngutang)' : '🟢 Piutang (saya ngutangin)'}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    {formTambah.jenis === 'Utang'
                                        ? 'Uang masuk ke aset kamu, harus dikembalikan nanti'
                                        : 'Uang keluar dari aset kamu, akan kembali nanti'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Nama Pihak</label>
                                <input type="text" required placeholder="Contoh: Budi, Mama, PT ABC"
                                    value={formTambah.namaPihak}
                                    onChange={e => setFormTambah(p => ({ ...p, namaPihak: e.target.value }))}
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Nominal (Rp)</label>
                                <input type="text" required placeholder="Contoh: 500000"
                                    value={formatNumberInput(formTambah.nominalAwal)}
                                    onChange={e => setFormTambah(p => ({ ...p, nominalAwal: e.target.value.replace(/\D/g, '') }))}
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Aset Terkait</label>
                                <input type="text" list="listAsetUP" required
                                    placeholder="Dari/ke aset mana?"
                                    value={formTambah.asetTerkait}
                                    onChange={e => setFormTambah(p => ({ ...p, asetTerkait: e.target.value }))}
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                <datalist id="listAsetUP">
                                    {LIST_ASET.map(a => <option key={a} value={a} />)}
                                </datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Tanggal Mulai</label>
                                    <input type="date" required
                                        value={formTambah.tanggalMulai}
                                        onChange={e => setFormTambah(p => ({ ...p, tanggalMulai: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Jatuh Tempo <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span></label>
                                    <input type="date"
                                        value={formTambah.jatuhTempo}
                                        onChange={e => setFormTambah(p => ({ ...p, jatuhTempo: e.target.value }))}
                                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Keterangan <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span></label>
                                <input type="text" placeholder="Contoh: Pinjam untuk beli HP"
                                    value={formTambah.keterangan}
                                    onChange={e => setFormTambah(p => ({ ...p, keterangan: e.target.value }))}
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <button type="submit" disabled={isSubmitting}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition disabled:opacity-50">
                                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL BAYAR CICILAN ===== */}
            {showModalBayar && selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-5 border-b">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Bayar Cicilan</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedItem.namaPihak} — Sisa {formatRp(selectedItem.sisaTagihan)}</p>
                            </div>
                            <button onClick={() => setShowModalBayar(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleBayar} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Nominal Bayar (Rp)</label>
                                <input type="text" required placeholder="Masukkan nominal"
                                    value={formatNumberInput(formBayar.nominalBayar)}
                                    onChange={e => setFormBayar(p => ({ ...p, nominalBayar: e.target.value.replace(/\D/g, '') }))}
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Dari Aset</label>
                                <input type="text" readOnly value={formBayar.asetBayar} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Keterangan <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span></label>
                                <input type="text" placeholder="Contoh: Cicilan ke-1"
                                    value={formBayar.keterangan}
                                    onChange={e => setFormBayar(p => ({ ...p, keterangan: e.target.value }))}
                                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <button type="submit" disabled={isSubmitting}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition disabled:opacity-50">
                                {isSubmitting ? 'Memproses...' : 'Simpan Pembayaran'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL TANDAI LUNAS ===== */}
            {showModalLunas && selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-5 border-b">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Tandai Lunas</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Sisa tagihan: {formatRp(selectedItem.sisaTagihan)}</p>
                            </div>
                            <button onClick={() => setShowModalLunas(false)}><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-100">
                                Sisa tagihan sebesar <b>{formatRp(selectedItem.sisaTagihan)}</b> akan otomatis dicatat sebagai transaksi pelunasan.
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Dari Aset</label>
                                <input type="text" readOnly value={asetLunas} className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-not-allowed" />
                            </div>
                            <button onClick={handleLunas} disabled={isSubmitting}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition disabled:opacity-50">
                                {isSubmitting ? 'Memproses...' : '✓ Konfirmasi Lunas'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}