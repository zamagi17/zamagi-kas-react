import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Edit, Trash, Search, Plus,
    Download, RefreshCw, ArrowLeftRight
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
    const [showModalForm, setShowModalForm] = useState(false);
    const [masterAset, setMasterAset] = useState([]);
    const [masterKategori, setMasterKategori] = useState([]);
    const [tambahKategoriBaru, setTambahKategoriBaru] = useState(false);
    const [inputKategoriBaru, setInputKategoriBaru] = useState('');
    const [isSavingKategoriBaru, setIsSavingKategoriBaru] = useState(false);

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

    // Tambahkan fetch di useEffect awal
    useEffect(() => {
        if (!token) return;
        // Fetch master aset
        fetch(`${baseUrl}/api/master/aset`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(res => res.ok ? res.json() : [])
            .then(data => setMasterAset(data.filter(a => a.isAktif)))
            .catch(() => { });

        // Fetch master kategori
        fetch(`${baseUrl}/api/master/kategori`, { headers: { 'Authorization': 'Bearer ' + token } })
            .then(res => res.ok ? res.json() : [])
            .then(data => setMasterKategori(data))
            .catch(() => { });
    }, [token]);

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
            const res = await fetch(`${API_URL}?bulan=${filterBulan}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (res.status === 401) { localStorage.clear(); navigate('/'); return; }

            const responseJson = await res.json();

            const data = responseJson.data || [];

            let historyTemp = [];
            const asetSet = new Set([...listAset]);
            const kategoriSet = new Set([...listKategori]);

            data.forEach(row => {
                let rowDate = new Date(row.tanggal);
                let timeStr = "";
                if (row.createdAt) {
                    const createdDate = new Date(row.createdAt);
                    timeStr = createdDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                }

                if (row.sumberDana) asetSet.add(row.sumberDana);
                if (row.kategori) kategoriSet.add(row.kategori);

                historyTemp.push({
                    id: row.id,
                    tanggalAsli: row.tanggal,
                    tglStr: rowDate.toLocaleDateString('id-ID'),
                    timeStr: timeStr,
                    kategori: row.kategori,
                    keterangan: row.keterangan,
                    sumberDana: row.sumberDana || 'Lain-lain',
                    jenis: row.jenis,
                    nominal: row.nominal || 0
                });
            });

            setListAset(Array.from(asetSet));
            setListKategori(Array.from(kategoriSet));

            setHistoryData(historyTemp.sort((a, b) => {
                const timeA = new Date(a.tanggalAsli).getTime();
                const timeB = new Date(b.tanggalAsli).getTime();
                if (timeB !== timeA) return timeB - timeA;
                return b.id - a.id;
            }));

            setShowPanduan(responseJson.showGuide === true);
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
                const payloadTransfer = {
                    tanggal: formData.tanggal,
                    sumberDana: formData.sumberDana,
                    sumberDanaTujuan: formData.sumberDanaTujuan,
                    nominal: nominalAngka,
                    keterangan: formData.keterangan
                };

                const res = await fetch(`${API_URL}/transfer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify(payloadTransfer)
                });

                if (!res.ok) {
                    throw new Error(await res.text());
                }
            } else {
                const payload = { ...basePayload, jenis: formData.jenis, sumberDana: formData.sumberDana };
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify(payload)
                });
            }
            handleBatalEdit();
            setShowModalForm(false);
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
        setShowModalForm(true);
    };

    const handleTambahBaru = () => {
        handleBatalEdit();
        setShowModalForm(true);
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
        let csv = ['"ID","Tanggal","Kategori","Keterangan","Dompet / Rekening","Jenis Transaksi","Nominal"'];
        filteredHistory.forEach(h => csv.push(`"${h.id}","${h.tglStr}","${h.timeStr}","${h.kategori}","${h.keterangan}","${h.sumberDana}","${h.jenis}","${h.nominal}"`));
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(new Blob([csv.join("\n")], { type: "text/csv" }));
        a.download = `Laporan_${currentUser}_${filterBulan}.csv`;
        a.click();
    };

    const simpanKategoriBaru = async () => {
        if (!inputKategoriBaru.trim() || isSavingKategoriBaru) return;
        setIsSavingKategoriBaru(true);

        try {
            const res = await fetch(`${baseUrl}/api/master/kategori`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nama: inputKategoriBaru.trim() })
            });
            if (res.ok) {
                const kategoriBar = await res.json();
                setMasterKategori(prev => [...prev, kategoriBar].sort((a, b) => a.nama.localeCompare(b.nama)));
                setFormData(prev => ({ ...prev, kategori: kategoriBar.nama }));
                setTambahKategoriBaru(false);
                setInputKategoriBaru('');
            } else {
                const msg = await res.text();
                alert(msg);
            }
        } catch {
            alert('Gagal menambah kategori');
        } finally {
            setIsSavingKategoriBaru(false);
        }
    };

    const getLabelSumberDana = (jenis) => {
        switch (jenis) {
            case 'Pemasukan':
                return 'Simpan ke Dompet / Rekening';
            case 'Pengeluaran':
                return 'Gunakan Saldo Dari';
            case 'Transfer':
                return 'Dari Dompet / Rekening (Asal)';
            case 'Rencana Pemasukan':
                return 'Rencana Masuk ke Dompet';
            case 'Rencana Pengeluaran':
                return 'Rencana Gunakan Saldo Dari';
            default:
                return 'Pilih Dompet / Rekening';
        }
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

                {/* Header Baru (Sama seperti Budget & Dashboard) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white shadow-sm">
                            <ArrowLeftRight size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-50">Data Transaksi</h2>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Catat dan kelola arus kas Anda</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="month"
                            value={filterBulan}
                            onChange={(e) => setFilterBulan(e.target.value)}
                            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleTambahBaru}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition shadow-sm"
                        >
                            <Plus size={16} /> Tambah
                        </button>
                    </div>
                </div>

                {/* Banner Panduan Pengguna Baru */}
                {showPanduan && (
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50 p-6 shadow-sm">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.1) 0%, transparent 50%)' }}></div>
                        <button
                            onClick={() => setShowPanduan(false)}
                            className="absolute top-4 right-4 p-2 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition"
                            title="Tutup panduan"
                        >
                            <span className="text-xl font-bold">✕</span>
                        </button>

                        <div className="relative flex gap-4">
                            <div className="flex-1">
                                <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg mb-2">
                                    Selamat datang! Yuk persiapkan dompet kamu 💳
                                </h3>
                                <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
                                    Sebelum mencatat transaksi, pastikan kamu sudah mendaftarkan akun bank atau dompet kamu di menu <b>Setting</b>.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    {[
                                        { step: '1', text: 'Pergi ke Menu Setting' },
                                        { step: '2', text: 'Tambah Aset (BCA, GoPay, dll)' },
                                        { step: '3', text: 'Catat Saldo Awal per Aset' },
                                        { step: '4', text: 'Kembali ke halaman Transaksi' },
                                        { step: '5', text: 'Pilih Dompet yang sudah dibuat' },
                                        { step: '6', text: 'Mulai catat arus kas kamu!' },
                                    ].map(item => (
                                        <div key={item.step} className="flex items-center gap-2.5 text-sm bg-white/50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-blue-200/50 dark:border-blue-700/30">
                                            <span className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                                                {item.step}
                                            </span>
                                            <span className="text-blue-900 dark:text-blue-100 font-medium">{item.text}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg px-4 py-3 text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    <b>Contoh:</b> Punya saldo BCA Rp 2.500.000 dan GoPay Rp 150.000?<br />
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

                {/* Modal Tambah/Edit Transaksi */}
                {showModalForm && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm transition-all">
                        <div className="w-full max-w-4xl max-h-[90vh] sm:max-h-[95vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-700/70 bg-white dark:bg-slate-950 shadow-2xl">

                            <div className="flex-shrink-0 flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur sticky top-0 z-10">
                                <div>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                        {editId ? 'Perbarui detail transaksi' : 'Masukkan detail transaksi baru'}
                                    </p>
                                    <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                        {editId ? 'Ubah Transaksi' : 'Transaksi Baru'}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setShowModalForm(false); if (editId) handleBatalEdit(); }}
                                    className="flex-shrink-0 rounded-full w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 transition"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSimpan} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 sm:py-6">
                                <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">Tanggal</label>
                                        <input
                                            type="date"
                                            name="tanggal"
                                            value={formData.tanggal}
                                            onChange={handleInputChange}
                                            required
                                            className="block w-full px-4 py-3 text-base md:text-sm appearance-none min-h-[48px] border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 transition font-sans"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">Jenis Transaksi</label>
                                        <select name="jenis" value={formData.jenis} onChange={handleInputChange} required className="w-full px-4 py-3 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 transition">
                                            <option value="Pemasukan">Pemasukan</option>
                                            <option value="Pengeluaran">Pengeluaran</option>
                                            <option value="Transfer">Pindah Saldo (Transfer)</option>
                                            <option value="Rencana Pemasukan">Rencana Pemasukan</option>
                                            <option value="Rencana Pengeluaran">Rencana Pengeluaran</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">
                                            Kategori Transaksi
                                        </label>
                                        {formData.jenis === 'Transfer' ? (
                                            <input type="text" value="Transfer Aset (Auto)" disabled
                                                className="w-full px-4 py-3 text-base md:text-sm border border-blue-300 dark:border-blue-700 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold cursor-not-allowed" />
                                        ) : tambahKategoriBaru ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Nama kategori baru..."
                                                    value={inputKategoriBaru}
                                                    onChange={e => setInputKategoriBaru(e.target.value)}
                                                    disabled={isSavingKategoriBaru}
                                                    onKeyDown={async e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            await simpanKategoriBaru();
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setTambahKategoriBaru(false);
                                                            setInputKategoriBaru('');
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-3 text-base md:text-sm border border-blue-300 dark:border-blue-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900 disabled:opacity-50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={simpanKategoriBaru}
                                                    disabled={isSavingKategoriBaru}
                                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold transition min-w-[70px]"
                                                >
                                                    {isSavingKategoriBaru ? '...' : 'Simpan'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setTambahKategoriBaru(false); setInputKategoriBaru(''); }}
                                                    disabled={isSavingKategoriBaru}
                                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition disabled:opacity-50"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <select name="kategori" value={formData.kategori} onChange={handleInputChange} required
                                                    className="flex-1 px-4 py-3 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 transition">
                                                    <option value="">-- Pilih Kategori --</option>
                                                    {masterKategori.map(k => <option key={k.id} value={k.nama}>{k.nama}</option>)}
                                                </select>
                                                <button type="button"
                                                    onClick={() => setTambahKategoriBaru(true)}
                                                    title="Tambah kategori baru"
                                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-sm font-bold transition border border-slate-200 dark:border-slate-700">
                                                    + Baru
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">
                                            {getLabelSumberDana(formData.jenis)}
                                        </label>
                                        <select
                                            name="sumberDana"
                                            value={formData.sumberDana}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 transition"
                                        >
                                            {masterAset.length === 0 ? (
                                                <option value="" disabled>❌ Belum ada aset. Tambah di Setting dulu.</option>
                                            ) : (
                                                <>
                                                    <option value="">-- Pilih Aset --</option>
                                                    {masterAset.map(a => <option key={a.id} value={a.nama}>{a.nama}</option>)}
                                                </>
                                            )}
                                        </select>
                                        {masterAset.length === 0 && (
                                            <button
                                                type="button"
                                                onClick={() => navigate('/Settings')}
                                                className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                            >
                                                ⚙️ Pergi ke Setting untuk tambah aset
                                            </button>
                                        )}
                                    </div>
                                    {formData.jenis === 'Transfer' && (
                                        <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-5 rounded-2xl border border-dashed border-blue-300 dark:border-blue-700/50 mt-1">
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">
                                                Pindah ke Dompet / Rekening (Tujuan)
                                            </label>
                                            <select
                                                name="sumberDanaTujuan"
                                                value={formData.sumberDanaTujuan}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
                                            >
                                                {masterAset.length === 0 ? (
                                                    <option value="" disabled>❌ Belum ada aset tujuan.</option>
                                                ) : (
                                                    <>
                                                        <option value="">-- Pilih Aset Tujuan --</option>
                                                        {masterAset.map(a => <option key={a.id} value={a.nama}>{a.nama}</option>)}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">Nominal (Rp)</label>
                                        <input type="text" inputMode="numeric" name="nominal" value={formData.nominal ? new Intl.NumberFormat('id-ID').format(formData.nominal) : ''} onChange={handleInputChange} required placeholder="Contoh: 150000" className="w-full px-4 py-3 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 transition" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-100 mb-2">
                                            Keterangan <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(opsional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="keterangan"
                                            value={formData.keterangan}
                                            onChange={handleInputChange}
                                            placeholder="Contoh: Makan siang di warung"
                                            className="w-full px-4 py-3 text-base md:text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 transition"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                                    <button type="submit" disabled={isSubmitting} className="flex-1 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 sm:py-3 rounded-2xl transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                                        {isSubmitting ? 'Memproses...' : (editId ? 'Simpan Perubahan' : 'Simpan Transaksi')}
                                    </button>
                                    {editId && (
                                        <button type="button" onClick={() => { handleBatalEdit(); setShowModalForm(false); }} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition active:scale-[0.98]">
                                            Batal Edit
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Tabel Riwayat */}
                <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                        <div className="relative flex-1 flex items-center">
                            <Search size={18} className="absolute left-4 text-slate-400 dark:text-slate-500" />
                            <input
                                type="text" placeholder="Cari kategori, keterangan, dompet..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-11 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-3 text-slate-400 dark:text-slate-500 hover:text-slate-600">✕</button>
                            )}
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={fetchData} disabled={isLoading} className="flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition border border-slate-200 dark:border-slate-700 disabled:opacity-50">
                                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button onClick={exportCSV} className="flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                                <Download size={16} /> <span className="hidden sm:inline">Unduh CSV</span>
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="animate-pulse space-y-3">
                            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />)}
                        </div>
                    ) : (
                        <>
                            <div className="md:overflow-x-auto md:rounded-xl md:border border-slate-200 dark:border-slate-700/50">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="hidden md:table-header-group bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-center">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-sm border-b border-slate-200 dark:border-slate-700">Tanggal</th>
                                            <th className="px-4 py-3 font-semibold text-sm border-b border-slate-200 dark:border-slate-700">Kategori & Keterangan</th>
                                            <th className="px-4 py-3 font-semibold text-sm border-b border-slate-200 dark:border-slate-700">Dompet / Rekening</th>
                                            <th className="px-4 py-3 font-semibold text-sm border-b border-slate-200 dark:border-slate-700">Nominal</th>
                                            <th className="px-4 py-3 font-semibold text-sm text-center border-b border-slate-200 dark:border-slate-700">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="block md:table-row-group">
                                        {dataTampil.length === 0 ? (
                                            <tr className="block md:table-row">
                                                <td colSpan="5" className="block md:table-cell px-4 py-8 text-center text-slate-500 dark:text-slate-400">Data tidak ditemukan.</td>
                                            </tr>
                                        ) : dataTampil.map(h => {
                                            let rowBg = 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50';
                                            let badge = null;
                                            let textStyle = 'font-bold text-slate-800';

                                            if (h.jenis.includes('Rencana')) { rowBg = 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20'; badge = <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 font-bold text-[10px] px-1.5 py-0.5 rounded mr-2">PROYEKSI</span>; textStyle = 'font-bold text-orange-600 dark:text-orange-400'; }
                                            else if (h.jenis === 'Transfer') { rowBg = 'bg-blue-50/30 hover:bg-blue-50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20'; badge = <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 font-bold text-[10px] px-1.5 py-0.5 rounded mr-2">TRANSFER</span>; }
                                            else if (h.jenis === 'Utang Masuk') { rowBg = 'bg-purple-50/50 hover:bg-purple-50 dark:bg-purple-900/10 dark:hover:bg-purple-900/20'; badge = <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 font-bold text-[10px] px-1.5 py-0.5 rounded mr-2">UTANG</span>; textStyle = 'font-bold text-purple-600 dark:text-purple-400'; }
                                            else if (h.jenis === 'Piutang Keluar') { rowBg = 'bg-purple-50/50 hover:bg-purple-50 dark:bg-purple-900/10 dark:hover:bg-purple-900/20'; badge = <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 font-bold text-[10px] px-1.5 py-0.5 rounded mr-2">PIUTANG</span>; textStyle = 'font-bold text-purple-600 dark:text-purple-400'; }
                                            else if (h.jenis === 'Bayar Utang') { rowBg = 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20'; badge = <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 font-bold text-[10px] px-1.5 py-0.5 rounded mr-2">BAYAR UTANG</span>; textStyle = 'font-bold text-orange-600 dark:text-orange-400'; }
                                            else if (h.jenis === 'Terima Piutang') { rowBg = 'bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20'; badge = <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 font-bold text-[10px] px-1.5 py-0.5 rounded mr-2">TERIMA PIUTANG</span>; textStyle = 'font-bold text-orange-600 dark:text-orange-400'; }
                                            else if (h.jenis === 'Pemasukan') { textStyle = 'font-bold text-emerald-600 dark:text-emerald-400'; }
                                            else if (h.jenis === 'Pengeluaran') { textStyle = 'font-bold text-red-600 dark:text-red-400'; }

                                            const isTransferMutasi = h.kategori === 'Transfer Aset (Auto)' &&
                                                (h.keterangan?.includes('Mutasi Masuk') || h.keterangan?.includes('Mutasi Keluar'));

                                            const canEdit = !['Utang Masuk', 'Piutang Keluar', 'Bayar Utang', 'Terima Piutang'].includes(h.jenis) && !isTransferMutasi;
                                            const canDelete = !['Utang Masuk', 'Piutang Keluar'].includes(h.jenis) && (h.jenis !== 'Transfer' ? true : isTransferMutasi || h.kategori !== 'Transfer Aset (Auto)');

                                            return (
                                                <tr key={h.id} className={`flex flex-col md:table-row mb-4 md:mb-0 border border-slate-200 md:border-0 md:border-b md:border-slate-100 dark:md:border-slate-700 rounded-xl md:rounded-none shadow-sm md:shadow-none overflow-hidden transition-colors ${rowBg}`}>
                                                    <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 dark:border-slate-800 md:border-0 whitespace-nowrap">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 dark:text-slate-500 uppercase">Tanggal</span>
                                                        <div>
                                                            <span className="text-slate-700 dark:text-slate-200 font-medium block">{h.tglStr}</span>
                                                            {h.timeStr && (
                                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                                                                    🕒 {h.timeStr}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="flex flex-col md:table-cell px-4 py-3 border-b border-slate-100 dark:border-slate-800 md:border-0">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 dark:text-slate-500 uppercase mb-1">Info Transaksi</span>
                                                        <div>{badge}<span className="font-bold text-slate-800 dark:text-slate-200">{h.kategori}</span><span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">{h.keterangan}</span></div>
                                                    </td>
                                                    <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 dark:border-slate-800 md:border-0">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 dark:text-slate-500 uppercase">Dompet / Rek</span>
                                                        <span className="text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-xs">{h.sumberDana}</span>
                                                    </td>
                                                    <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 dark:border-slate-800 md:border-0 md:text-right">
                                                        <span className="md:hidden font-bold text-xs text-slate-400 uppercase">Nominal</span>
                                                        <span className={`text-lg md:text-sm ${textStyle}`}>{formatRp(h.nominal)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="flex justify-end md:justify-center items-center gap-2">
                                                            {canEdit && (
                                                                <button onClick={() => siapkanEdit(h)} className="flex items-center gap-1.5 p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition" title="Edit Transaksi">
                                                                    <Edit size={16} />
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button onClick={() => handleHapus(h.id)} className="flex items-center gap-1.5 p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition" title="Hapus Transaksi">
                                                                    <Trash size={16} />
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
                                <div className="flex justify-center gap-1.5 mt-6 flex-wrap pt-4 border-t border-slate-200 dark:border-slate-700">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${currentPage === i + 1 ? 'bg-blue-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
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