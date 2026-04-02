import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Pie } from 'react-chartjs-2';
import {
  Wallet, PieChart, TrendingUp, TrendingDown, ArrowRightLeft,
  Edit3, Trash2, Search, Download, RefreshCw, Calendar, LogOut
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const navigate = useNavigate();
  const currentUser = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const API_URL = 'https://increasing-felicity-zamagi-apps-3fc54a80.koyeb.app/api/transaksi';
  //testing 
  // const API_URL = 'http://localhost:8081/api/transaksi';

  // --- STATE DASHBOARD ---
  const [filterBulan, setFilterBulan] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    saldoAwal: 0, totalMasuk: 0, totalKeluar: 0,
    rencanaMasuk: 0, rencanaKeluar: 0, totalNetWorth: 0,
    hariIniMasuk: 0, hariIniKeluar: 0
  });
  const [portofolio, setPortofolio] = useState({});
  const [dataChartPengeluaran, setDataChartPengeluaran] = useState({});
  const [listAset, setListAset] = useState([
    'BCA', 'SeaBank', 'Bank Jago', 'Bank BRI', 'Dompet Tunai',
    'e-Wallet (Gopay/OVO/Dana)', 'Bank RDN', 'Reksa Dana', 'Emas/Logam Mulia'
  ]);

  const [listKategori, setListKategori] = useState([
    'Transfer Aset (Auto)', 'Gaji & Pendapatan', 'Makan & Minum',
    'Transportasi / Bensin', 'Tanggungan Orang Tua', 'Pembelian Aset / Investasi',
    'Tagihan (Listrik / Internet)', 'Hiburan / Jajan'
  ]);

  // --- STATE TABEL & HISTORY ---
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- STATE FORM INPUT ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    tanggal: new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).toISOString().split('T')[0],
    kategori: '', jenis: 'Pengeluaran', sumberDana: '', sumberDanaTujuan: '', nominal: '', keterangan: ''
  });

  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);

  useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);
  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  // --- FETCH DATA ---
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL, { headers: { 'Authorization': 'Bearer ' + token } });
      if (res.status === 401) { alert("Sesi habis."); handleLogout(); return; }

      const data = await res.json();
      let [fYear, fMonth] = filterBulan.split('-');
      let sAwal = 0, tMasuk = 0, tKeluar = 0, rMasuk = 0, rKeluar = 0, netWorth = 0, hMasuk = 0, hKeluar = 0;
      let portoAllTime = {};
      let chartPengeluaranBulanan = {};
      let historyTemp = [];

      const nowWIB = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const todayDateStr = `${nowWIB.getFullYear()}-${String(nowWIB.getMonth() + 1).padStart(2, '0')}-${String(nowWIB.getDate()).padStart(2, '0')}`;

      data.forEach(row => {
        let rowDate = new Date(row.tanggal);
        let rYear = rowDate.getFullYear().toString();
        let rMonth = (rowDate.getMonth() + 1).toString().padStart(2, '0');
        let nom = row.nominal || 0;
        let sumber = row.sumberDana || 'Lain-lain';

        // Kalkulasi Portofolio Global
        if (row.jenis === 'Pemasukan' || row.jenis === 'Pengeluaran') {
          if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
          if (row.jenis === 'Pemasukan') { portoAllTime[sumber] += nom; netWorth += nom; }
          else if (row.jenis === 'Pengeluaran') { portoAllTime[sumber] -= nom; netWorth -= nom; }
        }

        // Cek apakah transaksi adalah transfer antar aset
        const isTransferOrMutasi = row.kategori === "Transfer Aset (Auto)" &&
          (row.keterangan && (row.keterangan.includes("Mutasi Masuk") || row.keterangan.includes("Mutasi Keluar")));

        // Filter per Bulan Aktif
        if (rYear < fYear || (rYear === fYear && rMonth < fMonth)) {
          if (row.jenis === 'Pemasukan') sAwal += nom;
          else if (row.jenis === 'Pengeluaran') sAwal -= nom;
        } else if (rYear === fYear && rMonth === fMonth) {

          if (row.jenis === 'Pemasukan') {
            if (!isTransferOrMutasi) tMasuk += nom; // Mengabaikan mutasi masuk dari Total Riil
          }
          else if (row.jenis === 'Pengeluaran') {
            if (!isTransferOrMutasi) tKeluar += nom; // Mengabaikan mutasi keluar dari Total Riil
            if (row.kategori !== "Transfer Aset (Auto)") chartPengeluaranBulanan[row.kategori] = (chartPengeluaranBulanan[row.kategori] || 0) + nom;
          }
          else if (row.jenis === 'Rencana Pemasukan') rMasuk += nom;
          else if (row.jenis === 'Rencana Pengeluaran') rKeluar += nom;

          // Cek transaksi hari ini
          if (row.tanggal === todayDateStr && row.kategori !== "Transfer Aset (Auto)") {
            if (row.jenis === 'Pemasukan') hMasuk += nom;
            else if (row.jenis === 'Pengeluaran') hKeluar += nom;
          }

          historyTemp.push({
            id: row.id, tanggalAsli: row.tanggal, tglStr: rowDate.toLocaleDateString('id-ID'),
            kategori: row.kategori, keterangan: row.keterangan, sumberDana: sumber, jenis: row.jenis, nominal: nom
          });
        }
      });

      setSummary({ saldoAwal: sAwal, totalMasuk: tMasuk, totalKeluar: tKeluar, rencanaMasuk: rMasuk, rencanaKeluar: rKeluar, totalNetWorth: netWorth, hariIniMasuk: hMasuk, hariIniKeluar: hKeluar });
      setPortofolio(portoAllTime);
      setDataChartPengeluaran(chartPengeluaranBulanan);

      // Sorting by Tanggal (Terbaru) lalu ID (Terbaru)
      setHistoryData(historyTemp.sort((a, b) => {
        const timeA = new Date(a.tanggalAsli).getTime();
        const timeB = new Date(b.tanggalAsli).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return b.id - a.id;
      }));
      setCurrentPage(1);

      // Gabungkan aset bawaan dengan aset dari database
      const asetSet = new Set([
        'BCA', 'SeaBank', 'Bank Jago', 'Bank BRI', 'Dompet Tunai',
        'e-Wallet (Gopay/OVO/Dana)', 'Bank RDN', 'Reksa Dana', 'Emas/Logam Mulia'
      ]);
      Object.keys(portoAllTime).forEach(a => asetSet.add(a));
      setListAset(Array.from(asetSet));

      const kategoriSet = new Set([
        'Transfer Aset (Auto)', 'Gaji & Pendapatan', 'Makan & Minum',
        'Transportasi / Bensin', 'Tanggungan Orang Tua', 'Pembelian Aset / Investasi',
        'Tagihan (Listrik / Internet)', 'Hiburan / Jajan'
      ]);
      data.forEach(row => {
        if (row.kategori) kategoriSet.add(row.kategori); // Masukkan semua kategori yang pernah diketik
      });
      setListKategori(Array.from(kategoriSet));

    } catch (err) { console.error("Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDashboardData(); }, [filterBulan, token]);
  // Kalau jenis = Transfer, otomatis set dan lock kategori
  useEffect(() => {
    if (formData.jenis === 'Transfer') {
      setFormData(prev => ({ ...prev, kategori: 'Transfer Aset (Auto)' }));
    }
  }, [formData.jenis]);

  // --- HANDLE FORM SUBMIT ---
  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'nominal') value = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, [name]: value });
  };

  const handleSimpan = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const nominalAngka = parseInt(formData.nominal) || 0;
    const basePayload = { tanggal: formData.tanggal, kategori: formData.kategori, keterangan: formData.keterangan, nominal: nominalAngka };

    try {
      if (editId) {
        const payload = { ...basePayload, jenis: formData.jenis, sumberDana: formData.sumberDana };
        await fetch(`${API_URL}/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
      } else if (formData.jenis === 'Transfer') {
        const p1 = { ...basePayload, jenis: 'Pengeluaran', sumberDana: formData.sumberDana, keterangan: formData.keterangan + " (Mutasi Keluar)" };
        const p2 = { ...basePayload, jenis: 'Pemasukan', sumberDana: formData.sumberDanaTujuan, keterangan: formData.keterangan + " (Mutasi Masuk)" };
        await Promise.all([
          fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(p1) }),
          fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(p2) })
        ]);
      } else {
        const payload = { ...basePayload, jenis: formData.jenis, sumberDana: formData.sumberDana };
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(payload) });
      }

      handleBatalEdit();
      fetchDashboardData();
    } catch (err) { alert("Terjadi kesalahan."); }
    finally { setIsSubmitting(false); }
  };

  const siapkanEdit = (item) => {
    setFormData({
      tanggal: item.tanggalAsli, kategori: item.kategori, jenis: item.jenis,
      sumberDana: item.sumberDana, sumberDanaTujuan: '', nominal: item.nominal.toString(), keterangan: item.keterangan
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

    if (isTransfer) {
      const keteranganDasar = item.keterangan
        .replace(' (Mutasi Keluar)', '')
        .replace(' (Mutasi Masuk)', '')
        .trim();

      // Tentukan suffix pasangan — kalau ini Keluar, cari Masuk, begitu sebaliknya
      const suffixPasangan = item.keterangan.includes('(Mutasi Keluar)')
        ? '(Mutasi Masuk)'
        : '(Mutasi Keluar)';

      // Cari pasangan dengan 4 kriteria sekaligus
      const pasangan = historyData.find(h =>
        h.id !== id &&
        h.kategori === 'Transfer Aset (Auto)' &&
        h.tanggalAsli === item.tanggalAsli &&      // tanggal sama
        h.nominal === item.nominal &&               // nominal sama
        h.keterangan === `${keteranganDasar} ${suffixPasangan}` // keterangan pasangan
      );

      const hapusPromises = [
        apiFetch(`${API_URL}/${id}`, { method: 'DELETE' })
      ];

      if (pasangan) {
        hapusPromises.push(
          apiFetch(`${API_URL}/${pasangan.id}`, { method: 'DELETE' })
        );
      } else {
        // Pasangan tidak ditemukan, tetap hapus yang dipilih saja
        console.warn("Pasangan transfer tidak ditemukan, hanya menghapus 1 data.");
      }

      await Promise.all(hapusPromises);

    } else {
      await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
    }

    fetchDashboardData();
  };

  // --- PAGINASI & SEARCH & EXPORT ---
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

  // --- CHART CONFIG ---
  const sisaKas = (summary.saldoAwal + summary.totalMasuk) - summary.totalKeluar;
  const estimasiAkhir = sisaKas + summary.rencanaMasuk - summary.rencanaKeluar;

  const pengeluaranData = {
    labels: Object.keys(dataChartPengeluaran),
    datasets: [{
      data: Object.values(dataChartPengeluaran),
      backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };
  const asetLabels = []; const asetValues = [];
  for (const [k, v] of Object.entries(portofolio)) { if (v > 0) { asetLabels.push(k); asetValues.push(v); } }
  const asetData = {
    labels: asetLabels,
    datasets: [{
      data: asetValues,
      backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#9b59b6'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-sans text-slate-800 pb-20">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-xl font-bold text-slate-800">Zamagi Kas Dashboard</h2>
            <p className="text-sm text-slate-500">Halo, <b>{currentUser}</b></p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 outline-none" />
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 transition">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-[400px] bg-slate-200 rounded-xl shadow-sm border border-slate-100"></div>
              <div className="h-[400px] bg-slate-200 rounded-xl shadow-sm border border-slate-100"></div>
              <div className="h-[300px] bg-slate-200 rounded-xl shadow-sm border border-slate-100"></div>
              <div className="h-[300px] bg-slate-200 rounded-xl shadow-sm border border-slate-100"></div>
            </div>
          </div>
        ) : (
          <>
            {/* --- DASHBOARD GRIDS --- */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* Kotak Arus Kas & Estimasi */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="flex items-center justify-center gap-2 font-bold text-slate-700 uppercase mb-4 pb-2 border-b">
                  <PieChart size={18} className="text-emerald-500" /> Arus Kas & Estimasi Budget
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Saldo Awal Bulan</span><span className="font-bold">{formatRp(summary.saldoAwal)}</span></div>
                  <div className="flex justify-between"><span>Total Masuk (Riil)</span><span className="font-bold text-emerald-600">+ {formatRp(summary.totalMasuk)}</span></div>
                  <div className="flex justify-between"><span>Total Keluar (Riil)</span><span className="font-bold text-red-600">- {formatRp(summary.totalKeluar)}</span></div>
                  <div className="flex justify-between items-center p-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg text-white shadow-md mt-3 transform transition-transform hover:scale-[1.02]">
                    <span className="font-bold text-sm tracking-wide">SISA KAS SAAT INI</span>
                    <span className="font-bold text-lg">{formatRp(sisaKas)}</span>
                  </div>

                  <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide mt-4 mb-2 bg-slate-50 py-1 rounded">Proyeksi Kas</div>
                  <div className="flex justify-between text-orange-600 text-xs"><span>Rencana Masuk</span><span>+ {formatRp(summary.rencanaMasuk)}</span></div>
                  <div className="flex justify-between text-orange-600 text-xs"><span>Rencana Keluar</span><span>- {formatRp(summary.rencanaKeluar)}</span></div>
                  <div className="flex justify-between p-2 bg-orange-50 rounded text-orange-800 font-bold mt-1"><span>ESTIMASI KAS AKHIR</span><span>{formatRp(estimasiAkhir)}</span></div>

                  <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide mt-4 mb-2 bg-slate-50 py-1 rounded">Ringkasan Hari Ini</div>
                  <div className="flex justify-between text-xs"><span>Masuk Hari Ini</span><span className="font-bold text-emerald-600">+ {formatRp(summary.hariIniMasuk)}</span></div>
                  <div className="flex justify-between text-xs"><span>Keluar Hari Ini</span><span className="font-bold text-red-600">- {formatRp(summary.hariIniKeluar)}</span></div>
                </div>
              </div>

              {/* Grafik Pengeluaran */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <h3 className="font-bold text-slate-700 uppercase mb-4 pb-2 border-b w-full text-center">Sebaran Pengeluaran Riil</h3>
                <div className="w-full h-56 flex justify-center">{Object.keys(dataChartPengeluaran).length > 0 ? <Doughnut data={pengeluaranData} options={{ maintainAspectRatio: false }} /> : <p className="text-slate-400 mt-10">Belum ada data.</p>}</div>
              </div>

              {/* Kotak Net Worth */}
              <div className="bg-slate-50 p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="flex items-center justify-center gap-2 font-bold text-blue-700 uppercase mb-4 pb-2 border-b border-blue-100">
                  <Wallet size={18} /> Net Worth & Saldo Aset
                </h3>
                <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                  {Object.entries(portofolio).map(([aset, nilai]) => (nilai !== 0 && <div key={aset} className="flex justify-between border-b border-slate-200/50 pb-1"><span className="text-slate-600 truncate">{aset}</span><span className="font-bold">{formatRp(nilai)}</span></div>))}
                </div>
                <div className="flex justify-between items-center p-3.5 bg-gradient-to-r from-blue-600 to-indigo-500 mt-4 rounded-lg text-white shadow-md transform transition-transform hover:scale-[1.02]">
                  <span className="font-bold text-sm tracking-wide">TOTAL NET WORTH</span>
                  <span className="font-bold text-lg">{formatRp(summary.totalNetWorth)}</span>
                </div>
              </div>

              {/* Grafik Aset */}
              <div className="bg-slate-50 p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <h3 className="font-bold text-blue-700 uppercase mb-4 pb-2 border-b border-blue-100 w-full text-center">Asset Allocation</h3>
                <div className="w-full h-56 flex justify-center">{asetLabels.length > 0 ? <Pie data={asetData} options={{ maintainAspectRatio: false }} /> : <p className="text-slate-400 mt-10">Belum ada aset.</p>}</div>
              </div>
            </div>

            {/* --- DATALISTS --- */}
            <datalist id="kategoriList">
              {listKategori.map((kat, index) => (
                <option key={index} value={kat} />
              ))}
            </datalist>

            <datalist id="listSumberDana">
              {listAset.map(aset => <option key={aset} value={aset} />)}
            </datalist>

            {/* --- FORM INPUT TRANSAKSI --- */}
            <div id="form-section" className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-8">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-5 pb-2 border-b">
                {editId ? <><Edit3 className="text-amber-500" /> Edit Transaksi</> : <><TrendingUp className="text-blue-500" /> Input Transaksi</>}
              </h3>
              <form onSubmit={handleSimpan} className="grid md:grid-cols-2 gap-5">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal</label><input type="date" name="tanggal" value={formData.tanggal} onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Arus Kas</label>
                  <select name="jenis" value={formData.jenis} onChange={handleInputChange} required className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Pemasukan">Pemasukan Riil (Uang Masuk ke Dompet/Aset)</option>
                    <option value="Pengeluaran">Pengeluaran Riil (Uang Keluar dari Dompet/Aset)</option>
                    <option value="Transfer" className="bg-blue-50 font-bold">🔄 Transfer Aset / Pindah Dana (Auto 2 Baris)</option>
                    <option value="Rencana Pemasukan" className="bg-orange-50">⏳ Rencana Pemasukan (Budget / Proyeksi)</option>
                    <option value="Rencana Pengeluaran" className="bg-orange-50">⏳ Rencana Pengeluaran (Budget / Proyeksi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori Transaksi</label>
                  <input
                    type="text"
                    name="kategori"
                    list="kategoriList"
                    value={formData.kategori}
                    onChange={handleInputChange}
                    required
                    placeholder="Pilih atau ketik kategori..."
                    autoComplete="off"
                    disabled={formData.jenis === 'Transfer'}
                    className={`w-full p-2.5 border rounded-lg outline-none transition
            ${formData.jenis === 'Transfer'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold cursor-not-allowed'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500'
                      }`}
                  />
                </div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">{formData.jenis === 'Transfer' ? 'Dari Dompet (Asal)' : 'Sumber Dana / Lokasi Aset'}</label><input type="text" name="sumberDana" list="listSumberDana" value={formData.sumberDana} onChange={handleInputChange} required placeholder="Pilih atau ketik aset baru..." autoComplete="off" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                {formData.jenis === 'Transfer' && (<div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200 border-dashed"><label className="block text-sm font-semibold text-blue-800 mb-1">Ke Dompet / Aset (Tujuan)</label><input type="text" name="sumberDanaTujuan" list="listSumberDana" value={formData.sumberDanaTujuan} onChange={handleInputChange} required placeholder="Pilih atau ketik aset baru..." autoComplete="off" className="w-full p-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>)}
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nominal (Rp)</label><input type="text" name="nominal" value={formData.nominal ? new Intl.NumberFormat('id-ID').format(formData.nominal) : ''} onChange={handleInputChange} required placeholder="Contoh: 150000" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Keterangan Detail</label><input type="text" name="keterangan" value={formData.keterangan} onChange={handleInputChange} required placeholder="Contoh: Makan siang / Budget kuota" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>

                <div className="md:col-span-2 flex flex-col md:flex-row gap-3 mt-2">
                  <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 shadow-sm">{isSubmitting ? 'Memproses...' : (editId ? 'Simpan Perubahan' : 'Simpan Transaksi')}</button>
                  {editId && <button type="button" onClick={handleBatalEdit} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition shadow-sm">Batal Edit</button>}
                </div>
              </form>
            </div>

            {/* --- TABEL HISTORY TRANSAKSI --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-8">
              <h3 className="text-lg font-bold text-slate-800 mb-5 pb-2 border-b">Riwayat Transaksi</h3>

              <div className="flex flex-col md:flex-row justify-between gap-4 mb-5">
                <div className="relative w-full md:w-1/2 flex items-center">
                  <Search size={18} className="absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari kategori, keterangan, dompet..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      title="Reset Pencarian"
                    >
                      ✖
                    </button>
                  )}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={fetchDashboardData} className="flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow-sm">
                    <RefreshCw size={16} /> Refresh Data
                  </button>
                  <button onClick={exportCSV} className="flex items-center justify-center gap-2 flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition shadow-sm">
                    <Download size={16} /> Unduh CSV Bulan Ini
                  </button>
                </div>
              </div>

              {/* --- TABEL / CARD HISTORY TRANSAKSI --- */}
              <div className="md:overflow-x-auto md:rounded-lg md:border border-slate-200">
                <table className="w-full text-sm text-left border-collapse">

                  {/* Header hanya muncul di mode Desktop (md:table-header-group) */}
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
                      <tr className="block md:table-row bg-white border md:border-0 rounded-lg shadow-sm md:shadow-none mb-4">
                        <td colSpan="5" className="block md:table-cell px-4 py-8 text-center text-slate-500 font-medium">Data tidak ditemukan.</td>
                      </tr>
                    ) : (
                      dataTampil.map(h => {
                        let rowBg = 'bg-white hover:bg-slate-50';
                        let badge = null;
                        let textStyle = 'font-bold text-slate-800';

                        if (h.jenis.includes('Rencana')) { rowBg = 'bg-orange-50/80 hover:bg-orange-100/80'; badge = <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2 tracking-wide">PROYEKSI</span>; textStyle = 'font-bold text-orange-600'; }
                        else if (h.jenis === 'Transfer') { rowBg = 'bg-blue-50/80 hover:bg-blue-100/80'; badge = <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded mr-2 tracking-wide">TRANSFER</span>; }
                        else if (h.jenis === 'Pemasukan') { textStyle = 'font-bold text-emerald-600'; }
                        else if (h.jenis === 'Pengeluaran') { textStyle = 'font-bold text-red-600'; }

                        return (
                          // Menggunakan flex-col untuk HP (Card), dan table-row untuk Laptop (Tabel)
                          <tr key={h.id} className={`flex flex-col md:table-row mb-4 md:mb-0 border border-slate-200 md:border-0 md:border-b md:border-slate-100 rounded-xl md:rounded-none shadow-sm md:shadow-none overflow-hidden transition-colors ${rowBg}`}>

                            {/* Tanggal */}
                            <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 md:border-0 whitespace-nowrap">
                              <span className="md:hidden font-bold text-xs text-slate-400 uppercase tracking-wider">Tanggal</span>
                              <span className="text-slate-700 font-medium">{h.tglStr}</span>
                            </td>

                            {/* Kategori & Keterangan */}
                            <td className="flex flex-col md:table-cell px-4 py-3 border-b border-slate-100 md:border-0">
                              <span className="md:hidden font-bold text-xs text-slate-400 uppercase tracking-wider mb-1.5">Info Transaksi</span>
                              <div>
                                {badge} <span className="font-bold text-slate-800 text-base md:text-sm">{h.kategori}</span>
                                <span className="text-sm md:text-xs text-slate-500 mt-0.5 block">{h.keterangan}</span>
                              </div>
                            </td>

                            {/* Dompet / Aset */}
                            <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 md:border-0">
                              <span className="md:hidden font-bold text-xs text-slate-400 uppercase tracking-wider">Sumber Dana</span>
                              <span className="text-slate-700 font-medium bg-slate-100 md:bg-transparent px-2 md:px-0 py-0.5 rounded text-sm">{h.sumberDana}</span>
                            </td>

                            {/* Nominal */}
                            <td className="flex justify-between md:table-cell px-4 py-3 border-b border-slate-100 md:border-0 md:text-right">
                              <span className="md:hidden font-bold text-xs text-slate-400 uppercase tracking-wider">Nominal</span>
                              <span className={`text-lg md:text-sm ${textStyle}`}>{formatRp(h.nominal)}</span>
                            </td>

                            {/* Aksi (Tombol Edit/Hapus) */}
                            <td className="px-4 py-3 border-b border-slate-100 md:border-0 align-middle">
                              <div className="flex justify-end md:justify-center items-center gap-2">

                                {h.kategori !== 'Transfer Aset (Auto)' && (
                                  <button
                                    onClick={() => siapkanEdit(h)}
                                    className="flex items-center justify-center gap-1.5 p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors active:scale-95"
                                    title="Edit Transaksi"
                                  >
                                    <Edit3 size={18} />
                                    <span className="md:hidden text-xs font-bold">Edit</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleHapus(h.id)}
                                  className="flex items-center justify-center gap-1.5 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                                  title="Hapus Transaksi"
                                >
                                  <Trash2 size={18} />
                                  {/* Teks hanya muncul di HP agar mudah dipencet, di laptop hanya icon */}
                                  <span className="md:hidden text-xs font-bold">Hapus</span>
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginasi */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-5 flex-wrap">
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3.5 py-1.5 rounded border text-sm font-semibold transition-colors ${currentPage === i + 1 ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}