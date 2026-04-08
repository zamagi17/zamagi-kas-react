import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, Edit3, Trash2, Search,
    Download, RefreshCw
} from 'lucide-react';
import Navbar from '../components/Navbar';

export default function Transaksi() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('username');

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
    const API_URL = `${baseUrl}/api/transaksi`;

    const [filterBulan, setFilterBulan] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isLoading, setIsLoading] = useState(true);
    const [historyData, setHistoryData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [showPanduan, setShowPanduan] = useState(false);

    const [listAset, setListAset] = useState([
        'BCA', 'SeaBank', 'Bank Jago', 'Bank BRI', 'Dompet Tunai',
        'e-Wallet (Gopay/OVO/Dana)', 'Bank RDN', 'Reksa Dana', 'Emas/Logam Mulia'
    ]);
    const [listKategori, setListKategori] = useState([
        'Transfer Aset (Auto)', 'Gaji & Pendapatan', 'Makan & Minum',
        'Transportasi / Bensin', 'Tanggungan Orang Tua', 'Pembelian Aset / Investasi',
        'Tagihan (Listrik / Internet)', 'Hiburan / Jajan'
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        tanggal: new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).toISOString().split('T')[0],
        kategori: '', jenis: 'Pengeluaran', sumberDana: '',
        sumberDanaTujuan: '', nominal: '', keterangan: ''
    });

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    // Otomatis set kategori saat jenis Transfer
    useEffect(() => {
        if (formData.jenis === 'Transfer') {
            setFormData(prev => ({ ...prev, kategori: 'Transfer Aset (Auto)' }));
        }
    }, [formData.jenis]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_URL, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) { localStorage.clear(); navigate('/'); return; }

            const data = await res.json();
            let [fYear, fMonth] = filterBulan.split('-');
            let historyTemp = [];

            const asetSet = new Set([
                'BCA', 'SeaBank', 'Bank Jago', 'Bank BRI', 'Dompet Tunai',
                'e-Wallet (Gopay/OVO/Dana)', 'Bank RDN', 'Reksa Dana', 'Emas/Logam Mulia'
            ]);
            const kategoriSet = new Set([
                'Transfer Aset (Auto)', 'Gaji & Pendapatan', 'Makan & Minum',
                'Transportasi / Bensin', 'Tanggungan Orang Tua', 'Pembelian Aset / Investasi',
                'Tagihan (Listrik / Internet)', 'Hiburan / Jajan'
            ]);

            data.forEach(row => {
                let rowDate = new Date(row.tanggal);
                let rYear = rowDate.getFullYear().toString();
                let rMonth = (rowDate.getMonth() + 1).toString().padStart(2, '0');

                if (row.sumberDana) asetSet.add(row.sumberDana);
                if (row.kategori) kategoriSet.add(row.kategori);

                if (rYear === fYear && rMonth === fMonth) {
                    historyTemp.push({
                        id: row.id,
                        tanggalAsli: row.tanggal,
                        tglStr: rowDate.toLocaleDateString('id-ID'),
                        kategori: row.kategori,
                        keterangan: row.keterangan,
                        sumberDana: row.sumberDana || 'Lain-lain',
                        jenis: row.jenis,
                        nominal: row.nominal || 0
                    });
                }
            });

            setListAset(Array.from(asetSet));
            setListKategori(Array.from(kategoriSet));
            setHistoryData(historyTemp.sort((a, b) => {
                const timeA = new Date(a.tanggalAsli).getTime();
                const timeB = new Date(b.tanggalAsli).getTime();
                if (timeB !== timeA) return timeB - timeA;
                return b.id - a.id;
            }));
            setShowPanduan(data.length <= 10);
            setCurrentPage(1);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [filterBulan, token]);

    const handleInputChange = (e) => {
        let { name, value } = e.target;
        if (name === 'nominal') value = value.replace(/[^0-9]/g, '');
        setFormData({ ...formData, [name]: value });
    };

    const handleSimpan = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const nominalAngka = parseInt(formData.nominal) || 0;
        const basePayload = {
            tanggal: formData.tanggal,
            kategori: formData.kategori,
            keterangan: formData.keterangan,
            nominal: nominalAngka
        };

        try {
            if (editId) {
                const payload = { ...basePayload, jenis: formData.jenis, sumberDana: formData.sumberDana };
                await fetch(`${API_URL}/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify(payload)
                });
            } else if (formData.jenis === 'Transfer') {
                const p1 = { ...basePayload, jenis: 'Pengeluaran', sumberDana: formData.sumberDana, keterangan: formData.keterangan + " (Mutasi Keluar)" };
                const p2 = { ...basePayload, jenis: 'Pemasukan', sumberDana: formData.sumberDanaTujuan, keterangan: formData.keterangan + " (Mutasi Masuk)" };
                await Promise.all([
                    fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(p1) }),
                    fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(p2) })
                ]);
            } else {
                const payload = { ...basePayload, jenis: formData.jenis, sumberDana: formData.sumberDana };
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify(payload)
                });
            }
            handleBatalEdit();
            fetchData();
        } catch (err) {
            alert("Terjadi kesalahan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const siapkanEdit = (item) => {
        setFormData({
            tanggal: item.tanggalAsli, kategori: item.kategori, jenis: item.jenis,
            sumberDana: item.sumberDana, sumberDanaTujuan: '', nominal: item.nominal.toString(),
            keterangan: item.keterangan
        });
        setEditId(item.id);
        window.scrollTo({ top: document.getElementById('form-section').offsetTop - 20, behavior: 'smooth' });
    };

    const handleBatalEdit = () => {
        setEditId(null);
        const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).toISOString().split('T')[0];
        setFormData({ tanggal: today, kategori: '', jenis: 'Pengeluaran', sumberDana: '', sumberDanaTujuan: '', nominal: '', keterangan: '' });
    };

    const handleHapus = async (id) => {
        const item = historyData.find(h => h.id === id);
        const isTransfer = item?.kategori === 'Transfer Aset (Auto)';

        const konfirmasi = window.confirm(
            isTransfer
                ? "Ini adalah transaksi transfer. Menghapus ini akan menghapus pasangannya juga. Lanjutkan?"
                : "Yakin ingin menghapus data ini?"
        );
        if (!konfirmasi) return;

        const fetchWithToken = (url, method = 'DELETE') =>
            fetch(url, { method, headers: { 'Authorization': 'Bearer ' + token } });

        if (isTransfer) {
            const keteranganDasar = item.keterangan
                .replace(' (Mutasi Keluar)', '').replace(' (Mutasi Masuk)', '').trim();
            const suffixPasangan = item.keterangan.includes('(Mutasi Keluar)')
                ? '(Mutasi Masuk)' : '(Mutasi Keluar)';
            const pasangan = historyData.find(h =>
                h.id !== id &&
                h.kategori === 'Transfer Aset (Auto)' &&
                h.tanggalAsli === item.tanggalAsli &&
                h.nominal === item.nominal &&
                h.keterangan === `${keteranganDasar} ${suffixPasangan}`
            );
            const hapusPromises = [fetchWithToken(`${API_URL}/${id}`)];
            if (pasangan) hapusPromises.push(fetchWithToken(`${API_URL}/${pasangan.id}`));
            await Promise.all(hapusPromises);
        } else {
            await fetchWithToken(`${API_URL}/${id}`);
        }
        fetchData();
    };

    const filteredHistory = historyData.filter(h =>
        h.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.sumberDana.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
    const dataTampil = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const exportCSV = () => {
        if (filteredHistory.length === 0) return alert("Tidak ada data untuk diunduh.");
        let csv = ['"ID","Tanggal","Kategori","Keterangan","Dompet / Aset","Jenis Arus Kas","Nominal Murni"'];
        filteredHistory.forEach(h => csv.push(`"${h.id}","${h.tglStr}","${h.kategori}","${h.keterangan}","${h.sumberDana}","${h.jenis}","${h.nominal}"`));
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(new Blob([csv.join("\n")], { type: "text/csv" }));
        a.download = `Laporan_${currentUser}_${filterBulan}.csv`;
        a.click();
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Riwayat Transaksi</h2>
                    <input
                        type="month"
                        value={filterBulan}
                        onChange={(e) => setFilterBulan(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                </div>

                {/* Banner Panduan Pengguna Baru */}
                {showPanduan && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 relative">
                        {/* Tombol tutup */}
                        <button
                            onClick={() => setShowPanduan(false)}
                            className="absolute top-3 right-3 text-blue-300 hover:text-blue-500 transition text-lg font-bold"
                            title="Tutup panduan"
                        >
                            ✕
                        </button>

                        <div className="flex items-start gap-3">
                            <span className="text-2xl">👋</span>
                            <div>
                                <h3 className="font-bold text-blue-800 text-base mb-1">
                                    Selamat datang! Yuk mulai catat keuangan kamu.
                                </h3>
                                <p className="text-blue-700 text-sm mb-3">
                                    Langkah pertama yang disarankan adalah mencatat <b>saldo awal</b> di setiap aset yang kamu miliki (rekening, dompet tunai, e-wallet, dll).
                                </p>

                                <div className="space-y-2">
                                    {[
                                        { step: '1', icon: '📅', text: 'Isi Tanggal — gunakan tanggal hari ini atau tanggal mulai kamu mencatat' },
                                        { step: '2', icon: '💰', text: 'Pilih Jenis Arus Kas → "Pemasukan Riil"' },
                                        { step: '3', icon: '🏷️', text: 'Isi Kategori → ketik "Saldo Awal" atau "Transfer Aset"' },
                                        { step: '4', icon: '🏦', text: 'Isi Sumber Dana → nama asetmu, misal "BCA", "Dompet Tunai", "GoPay"' },
                                        { step: '5', icon: '🔢', text: 'Isi Nominal → jumlah saldo yang kamu punya di aset tersebut' },
                                        { step: '6', icon: '📝', text: 'Keterangan → opsional, misal "Saldo awal BCA"' },
                                        { step: '7', icon: '✅', text: 'Klik Simpan — ulangi untuk setiap aset yang kamu miliki' },
                                    ].map(item => (
                                        <div key={item.step} className="flex items-start gap-2.5 text-sm">
                                            <span className="bg-blue-200 text-blue-800 font-black text-xs w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                                {item.step}
                                            </span>
                                            <span className="text-blue-700">
                                                <span className="mr-1">{item.icon}</span>
                                                {item.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg px-4 py-3 text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    <b>💡 Contoh:</b> Punya saldo BCA Rp 2.500.000 dan GoPay Rp 150.000?<br />
                                    Buat 2 transaksi terpisah — satu untuk BCA, satu untuk GoPay. Setelah itu kamu bisa mulai catat pengeluaran dan pemasukan seperti biasa.
                                </div>

                                <p className="text-xs text-blue-400 dark:text-blue-500 mt-3 italic">
                                    * Panduan ini akan otomatis hilang setelah kamu memiliki lebih dari 10 transaksi.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Datalists */}
                <datalist id="kategoriList">
                    {listKategori.map((kat, i) => <option key={i} value={kat} />)}
                </datalist>
                <datalist id="listSumberDana">
                    {listAset.map(aset => <option key={aset} value={aset} />)}
                </datalist>

                {/* Form Input */}
                <div id="form-section" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200  dark:bg-slate-900 dark:border-slate-700">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100 mb-5 pb-2 border-b">
                        {editId ? <><Edit3 className="text-amber-500" /> Edit Transaksi</> : <><TrendingUp className="text-blue-500" /> Input Transaksi</>}
                    </h3>
                    <form onSubmit={handleSimpan} className="grid md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Tanggal</label>
                            <input type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Jenis Arus Kas</label>
                            <select name="jenis" value={formData.jenis} onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="Pemasukan">Pemasukan Riil</option>
                                <option value="Pengeluaran">Pengeluaran Riil</option>
                                <option value="Transfer">🔄 Transfer Aset (Auto 2 Baris)</option>
                                <option value="Rencana Pemasukan">⏳ Rencana Pemasukan</option>
                                <option value="Rencana Pengeluaran">⏳ Rencana Pengeluaran</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Kategori Transaksi</label>
                            <input
                                type="text" name="kategori" list="kategoriList"
                                value={formData.kategori} onChange={handleInputChange}
                                required placeholder="Pilih atau ketik kategori..."
                                autoComplete="off"
                                disabled={formData.jenis === 'Transfer'}
                                className={`w-full p-2.5 border rounded-lg outline-none transition
                                    ${formData.jenis === 'Transfer'
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold cursor-not-allowed'
                                        : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500'}`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">
                                {formData.jenis === 'Transfer' ? 'Dari Dompet (Asal)' : 'Sumber Dana / Lokasi Aset'}
                            </label>
                            <input type="text" name="sumberDana" list="listSumberDana" value={formData.sumberDana} onChange={handleInputChange} required placeholder="Pilih atau ketik aset..." autoComplete="off" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        {formData.jenis === 'Transfer' && (
                            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-dashed">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Ke Dompet / Aset (Tujuan)</label>
                                <input type="text" name="sumberDanaTujuan" list="listSumberDana" value={formData.sumberDanaTujuan} onChange={handleInputChange} required placeholder="Pilih atau ketik aset..." autoComplete="off" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">Nominal (Rp)</label>
                            <input type="text" name="nominal" value={formData.nominal ? new Intl.NumberFormat('id-ID').format(formData.nominal) : ''} onChange={handleInputChange} required placeholder="Contoh: 150000" className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-1">
                                Keterangan Detail <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span>
                            </label>
                            <input
                                type="text"
                                name="keterangan"
                                value={formData.keterangan}
                                onChange={handleInputChange}
                                placeholder="Contoh: Makan siang"
                                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2 flex flex-col md:flex-row gap-3 mt-2">
                            <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 shadow-sm">
                                {isSubmitting ? 'Memproses...' : (editId ? 'Simpan Perubahan' : 'Simpan Transaksi')}
                            </button>
                            {editId && (
                                <button type="button" onClick={handleBatalEdit} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition shadow-sm">
                                    Batal Edit
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Tabel Riwayat */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200  dark:bg-slate-900 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5 pb-2 border-b">Riwayat Transaksi</h3>
                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-5">
                        <div className="relative w-full md:w-1/2 flex items-center">
                            <Search size={18} className="absolute left-3 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text" placeholder="Cari kategori, keterangan, dompet..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-10 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 dark:bg-slate-950"
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600">✖</button>
                            )}
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={fetchData} className="flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow-sm">
                                <RefreshCw size={16} /> Refresh
                            </button>
                            <button onClick={exportCSV} className="flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm">
                                <Download size={16} /> Unduh CSV
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="animate-pulse space-y-3">
                            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />)}
                        </div>
                    ) : (
                        <>
                            <div className="md:overflow-x-auto md:rounded-lg md:border border-slate-200">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="hidden md:table-header-group bg-slate-700 text-white text-center">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Tanggal</th>
                                            <th className="px-4 py-3 font-semibold">Kategori & Keterangan</th>
                                            <th className="px-4 py-3 font-semibold">Dompet / Aset</th>
                                            <th className="px-4 py-3 font-semibold">Nominal</th>
                                            <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="block md:table-row-group">
                                        {dataTampil.length === 0 ? (
                                            <tr className="block md:table-row">
                                                <td colSpan="5" className="block md:table-cell px-4 py-8 text-center text-slate-500 dark:text-slate-400">Data tidak ditemukan.</td>
                                            </tr>
                                        ) : dataTampil.map(h => {
                                            let rowBg = 'bg-white hover:bg-slate-50 dark:bg-slate-950';
                                            let badge = null;
                                            let textStyle = 'font-bold text-slate-800';

                                            if (h.jenis.includes('Rencana')) { rowBg = 'bg-orange-50/80 dark:bg-orange-900/20 hover:bg-orange-100/80 dark:hover:bg-orange-900/30'; badge = <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2">PROYEKSI</span>; textStyle = 'font-bold text-orange-600 dark:text-orange-400'; }
                                            else if (h.jenis === 'Transfer') { rowBg = 'bg-blue-50/80 dark:bg-blue-900/20'; badge = <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2">TRANSFER</span>; }
                                            else if (h.jenis === 'Utang Masuk') { rowBg = 'bg-purple-50/80 dark:bg-purple-900/20'; badge = <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2">UTANG</span>; textStyle = 'font-bold text-purple-600 dark:text-purple-400'; }
                                            else if (h.jenis === 'Piutang Keluar') { rowBg = 'bg-purple-50/80 dark:bg-purple-900/20'; badge = <span className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2">PIUTANG</span>; textStyle = 'font-bold text-purple-600 dark:text-purple-400'; }
                                            else if (h.jenis === 'Bayar Utang') { rowBg = 'bg-orange-50/80 dark:bg-orange-900/20 hover:bg-orange-100/80 dark:hover:bg-orange-900/30'; badge = <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2">BAYAR UTANG</span>; textStyle = 'font-bold text-orange-600 dark:text-orange-400'; }
                                            else if (h.jenis === 'Terima Piutang') { rowBg = 'bg-orange-50/80 dark:bg-orange-900/20 hover:bg-orange-100/80 dark:hover:bg-orange-900/30'; badge = <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2">TERIMA PIUTANG</span>; textStyle = 'font-bold text-orange-600 dark:text-orange-400'; }
                                            else if (h.jenis === 'Pemasukan') { textStyle = 'font-bold text-emerald-600 dark:text-emerald-400'; }
                                            else if (h.jenis === 'Pengeluaran') { textStyle = 'font-bold text-red-600 dark:text-red-400'; }

                                            const isTransferMutasi = h.kategori === 'Transfer Aset (Auto)' &&
                                                (h.keterangan?.includes('Mutasi Masuk') || h.keterangan?.includes('Mutasi Keluar'));

                                            const canEdit = !['Utang Masuk', 'Piutang Keluar', 'Bayar Utang', 'Terima Piutang'].includes(h.jenis) && !isTransferMutasi;
                                            const canDelete = !['Utang Masuk', 'Piutang Keluar'].includes(h.jenis) && (h.jenis !== 'Transfer' ? true : isTransferMutasi || h.kategori !== 'Transfer Aset (Auto)');

                                            return (
                                                <tr key={h.id} className={`flex flex-col md:table-row mb-4 md:mb-0 border border-slate-200 md:border-0 md:border-b md:border-slate-100 rounded-xl md:rounded-none shadow-sm md:shadow-none overflow-hidden transition-colors ${rowBg}`}>
                                                    <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 md:border-0 whitespace-nowrap">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 dark:text-slate-500 uppercase">Tanggal</span>
                                                        <span className="text-slate-700 dark:text-slate-100 font-medium">{h.tglStr}</span>
                                                    </td>
                                                    <td className="flex flex-col md:table-cell px-4 py-3 border-b border-slate-100 md:border-0">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 dark:text-slate-500 uppercase mb-1">Info Transaksi</span>
                                                        <div>{badge}<span className="font-bold text-slate-800 dark:text-slate-100">{h.kategori}</span><span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">{h.keterangan}</span></div>
                                                    </td>
                                                    <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 md:border-0">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 dark:text-slate-500 uppercase">Sumber Dana</span>
                                                        <span className="text-slate-700 dark:text-slate-100 font-medium bg-slate-100 dark:bg-slate-800 px-2 md:px-0 py-0.5 rounded text-sm">{h.sumberDana}</span>
                                                    </td>
                                                    <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 md:border-0 md:text-right">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 uppercase">Nominal</span>
                                                        <span className={`text-lg md:text-sm ${textStyle}`}>{formatRp(h.nominal)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="flex justify-end md:justify-center items-center gap-2">
                                                            {canEdit && (
                                                                <button onClick={() => siapkanEdit(h)} className="flex items-center gap-1.5 p-2 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition active:scale-95" title="Edit">
                                                                    <Edit3 size={18} /><span className="md:hidden text-xs font-bold">Edit</span>
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button onClick={() => handleHapus(h.id)} className="flex items-center gap-1.5 p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition active:scale-95" title="Hapus">
                                                                    <Trash2 size={18} /><span className="md:hidden text-xs font-bold">Hapus</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-5 flex-wrap">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3.5 py-1.5 rounded border text-sm font-semibold transition ${currentPage === i + 1 ? 'bg-slate-700 dark:bg-slate-600 text-white border-slate-700 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}