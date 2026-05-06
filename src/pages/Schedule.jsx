import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarClock, Clock3, Edit3, PauseCircle, PlayCircle, Plus, Trash2, Wallet, X
} from 'lucide-react';
import Navbar from '../components/Navbar';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
const DAYS = [
    { value: 1, label: 'Senin' },
    { value: 2, label: 'Selasa' },
    { value: 3, label: 'Rabu' },
    { value: 4, label: 'Kamis' },
    { value: 5, label: 'Jumat' },
    { value: 6, label: 'Sabtu' },
    { value: 7, label: 'Minggu' },
];

const todayJakarta = () =>
    new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).toISOString().split('T')[0];

const initialForm = () => ({
    title: '',
    frequency: 'monthly',
    interval: '1',
    dayOfWeek: '1',
    dayOfMonth: '25',
    startDate: todayJakarta(),
    timeOfDay: '08:00',
    timezone: 'Asia/Jakarta',
    active: true,
    jenis: 'Pengeluaran',
    kategori: '',
    sumberDana: '',
    nominal: '',
    keterangan: '',
});

export default function Schedule() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [schedules, setSchedules] = useState([]);
    const [masterAset, setMasterAset] = useState([]);
    const [masterKategori, setMasterKategori] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState(initialForm);

    const headers = useMemo(() => ({
        'Authorization': 'Bearer ' + token,
    }), [token]);

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    const formatInput = (value) => {
        const numbers = value.replace(/\D/g, '');
        return numbers ? new Intl.NumberFormat('id-ID').format(numbers) : '';
    };

    const formatNextRun = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Jakarta',
        });
    };

    const getScheduleText = (item) => {
        const interval = item.interval || 1;
        const time = (item.timeOfDay || '08:00').slice(0, 5);
        if (item.frequency === 'daily') return `Setiap ${interval} hari jam ${time}`;
        if (item.frequency === 'weekly') {
            const day = DAYS.find(d => d.value === item.dayOfWeek)?.label || 'Minggu';
            return interval === 1 ? `Setiap ${day} jam ${time}` : `Setiap ${interval} minggu, hari ${day} jam ${time}`;
        }
        const day = item.dayOfMonth || 1;
        return interval === 1 ? `Setiap tanggal ${day} jam ${time}` : `Setiap ${interval} bulan, tanggal ${day} jam ${time}`;
    };

    const fetchSchedules = useCallback(async (abortSignal) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${baseUrl}/api/schedules`, { headers, signal: abortSignal });
            if (res.status === 401) {
                localStorage.clear();
                navigate('/');
                return;
            }
            setSchedules(res.ok ? await res.json() : []);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Gagal memuat schedule:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, [headers, navigate]);

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        fetchSchedules(controller.signal);
        return () => controller.abort();
    }, [token, fetchSchedules]);

    useEffect(() => {
        if (!token) return;
        Promise.all([
            fetch(`${baseUrl}/api/master/aset`, { headers }).then(res => res.ok ? res.json() : []),
            fetch(`${baseUrl}/api/master/kategori`, { headers }).then(res => res.ok ? res.json() : []),
        ])
            .then(([aset, kategori]) => {
                setMasterAset(aset.filter(item => item.isAktif));
                setMasterKategori(kategori);
            })
            .catch(() => {});
    }, [token, headers]);

    const resetForm = () => {
        setFormData(initialForm());
        setEditItem(null);
    };

    const openCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (item) => {
        setEditItem(item);
        setFormData({
            title: item.title || '',
            frequency: item.frequency || 'monthly',
            interval: String(item.interval || 1),
            dayOfWeek: String(item.dayOfWeek || 1),
            dayOfMonth: String(item.dayOfMonth || 25),
            startDate: item.startDate || todayJakarta(),
            timeOfDay: (item.timeOfDay || '08:00').slice(0, 5),
            timezone: item.timezone || 'Asia/Jakarta',
            active: item.active !== false,
            jenis: item.jenis || 'Pengeluaran',
            kategori: item.kategori || '',
            sumberDana: item.sumberDana || '',
            nominal: formatInput(String(item.nominal || '')),
            keterangan: item.keterangan || '',
        });
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : name === 'nominal' ? formatInput(value) : value,
        }));
    };

    const buildPayload = () => ({
        title: formData.title.trim(),
        frequency: formData.frequency,
        interval: parseInt(formData.interval, 10) || 1,
        dayOfWeek: formData.frequency === 'weekly' ? parseInt(formData.dayOfWeek, 10) : null,
        dayOfMonth: formData.frequency === 'monthly' ? parseInt(formData.dayOfMonth, 10) : null,
        startDate: formData.startDate,
        timeOfDay: formData.timeOfDay,
        timezone: formData.timezone,
        active: formData.active,
        jenis: formData.jenis,
        kategori: formData.kategori,
        sumberDana: formData.sumberDana,
        nominal: parseInt(formData.nominal.replace(/\D/g, ''), 10) || 0,
        keterangan: formData.keterangan.trim(),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const url = editItem ? `${baseUrl}/api/schedules/${editItem.id}` : `${baseUrl}/api/schedules`;
            const method = editItem ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload()),
            });

            if (!res.ok) {
                alert(await res.text());
                return;
            }

            setShowModal(false);
            resetForm();
            fetchSchedules();
        } catch {
            alert('Gagal menyimpan schedule.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleActive = async (item) => {
        try {
            const res = await fetch(`${baseUrl}/api/schedules/${item.id}/active`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !item.active }),
            });
            if (res.ok) fetchSchedules();
            else alert(await res.text());
        } catch {
            alert('Gagal mengubah status schedule.');
        }
    };

    const deleteSchedule = async (item) => {
        if (!window.confirm(`Hapus schedule "${item.title}"?`)) return;
        try {
            const res = await fetch(`${baseUrl}/api/schedules/${item.id}`, {
                method: 'DELETE',
                headers,
            });
            if (res.ok) fetchSchedules();
            else alert(await res.text());
        } catch {
            alert('Gagal menghapus schedule.');
        }
    };

    const activeCount = schedules.filter(item => item.active).length;
    const nextSchedule = schedules.find(item => item.active);

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg text-white shadow-sm">
                            <CalendarClock size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-50">Schedule</h2>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Transaksi rutin dan jatuh tempo otomatis</p>
                        </div>
                    </div>
                    <button
                        onClick={openCreate}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-sm transition shadow-sm"
                    >
                        <Plus size={16} /> Tambah
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Aktif</p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Total</p>
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{schedules.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Berikutnya</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {nextSchedule ? formatNextRun(nextSchedule.nextRunAt) : '-'}
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
                        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <CalendarClock size={32} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="font-semibold text-slate-600 dark:text-slate-300">Belum ada schedule</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Klik "Tambah" untuk membuat transaksi rutin</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {schedules.map(item => (
                            <div key={item.id} className={`rounded-xl border p-4 shadow-sm transition ${item.active ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'}`}>
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-2 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                {item.active ? 'AKTIF' : 'PAUSE'}
                                            </span>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                                                <Clock3 size={13} /> {getScheduleText(item)}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                                                <Wallet size={13} /> {item.sumberDana}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            <b className={item.jenis === 'Pemasukan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                                {formatRp(item.nominal)}
                                            </b>
                                            <span className="mx-1">.</span>
                                            {item.jenis} untuk {item.kategori}
                                        </p>
                                        {item.keterangan && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500">{item.keterangan}</p>
                                        )}
                                    </div>
                                    <div className="flex md:flex-col items-center md:items-end justify-between gap-3">
                                        <div className="text-left md:text-right">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Next run</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{formatNextRun(item.nextRunAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => toggleActive(item)} className="p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition" title={item.active ? 'Pause' : 'Aktifkan'}>
                                                {item.active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                                            </button>
                                            <button onClick={() => openEdit(item)} className="p-2 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition" title="Edit">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={() => deleteSchedule(item)} className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Hapus">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-700/70 bg-white dark:bg-slate-950 shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Transaksi otomatis</p>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {editItem ? 'Edit Schedule' : 'Tambah Schedule'}
                                </h3>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Nama Schedule</label>
                                    <input
                                        required
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Contoh: Internet bulanan"
                                        className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Jenis</label>
                                    <select name="jenis" value={formData.jenis} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900">
                                        <option value="Pengeluaran">Pengeluaran</option>
                                        <option value="Pemasukan">Pemasukan</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Nominal</label>
                                    <input
                                        required
                                        inputMode="numeric"
                                        name="nominal"
                                        value={formData.nominal}
                                        onChange={handleChange}
                                        placeholder="Contoh: 250.000"
                                        className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900 font-bold text-blue-600 dark:text-blue-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Kategori</label>
                                    <select required name="kategori" value={formData.kategori} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900">
                                        <option value="">-- Pilih Kategori --</option>
                                        {masterKategori.map(item => <option key={item.id} value={item.nama}>{item.nama}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Dompet / Rekening</label>
                                    <select required name="sumberDana" value={formData.sumberDana} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900">
                                        <option value="">-- Pilih Aset --</option>
                                        {masterAset.map(item => <option key={item.id} value={item.nama}>{item.nama}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Pola</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'daily', label: 'Harian' },
                                            { value: 'weekly', label: 'Mingguan' },
                                            { value: 'monthly', label: 'Bulanan' },
                                        ].map(item => (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, frequency: item.value }))}
                                                className={`px-3 py-2 rounded-lg border text-sm font-bold transition ${formData.frequency === item.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Setiap</label>
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        max="365"
                                        name="interval"
                                        value={formData.interval}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Mulai</label>
                                    <input
                                        required
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Jam</label>
                                    <input
                                        required
                                        type="time"
                                        name="timeOfDay"
                                        value={formData.timeOfDay}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>

                                {formData.frequency === 'weekly' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Hari</label>
                                        <select name="dayOfWeek" value={formData.dayOfWeek} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900">
                                            {DAYS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                                        </select>
                                    </div>
                                )}

                                {formData.frequency === 'monthly' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Tanggal</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            max="31"
                                            name="dayOfMonth"
                                            value={formData.dayOfMonth}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                        />
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Timezone</label>
                                    <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900">
                                        <option value="Asia/Jakarta">Asia/Jakarta</option>
                                        <option value="Asia/Makassar">Asia/Makassar</option>
                                        <option value="Asia/Jayapura">Asia/Jayapura</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                                    Keterangan <span className="font-normal text-slate-400">(opsional)</span>
                                </label>
                                <input
                                    name="keterangan"
                                    value={formData.keterangan}
                                    onChange={handleChange}
                                    placeholder="Contoh: Paket internet rumah"
                                    className="w-full px-4 py-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-900"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    name="active"
                                    checked={formData.active}
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-slate-300"
                                />
                                Aktif
                            </label>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Menyimpan...' : (editItem ? 'Simpan Perubahan' : 'Buat Schedule')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
