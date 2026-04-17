/**
 * useAuth.js
 * Hook untuk mengelola token JWT + auto-refresh
 *
 * Cara kerja:
 * - Access token (15 menit) disimpan di localStorage["token"]
 * - Refresh token (7 hari) disimpan di localStorage["refreshToken"]
 * - Hook ini setup interval yang cek sisa waktu token setiap 1 menit
 * - Jika token akan expire < 2 menit lagi → otomatis refresh
 * - Jika refresh gagal (refresh token expired) → logout
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');

// Decode JWT payload tanpa library (JWT adalah base64url.base64url.signature)
function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

// Cek apakah token akan expire dalam X detik ke depan
function isTokenExpiringSoon(token, withinSeconds = 120) {
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now < withinSeconds;
}

// Cek apakah token sudah expired
function isTokenExpired(token) {
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
}

export function useAuth() {
    const navigate = useNavigate();
    const refreshingRef = useRef(false); // cegah double-refresh

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
        navigate('/');
    }, [navigate]);

    const doRefresh = useCallback(async () => {
        if (refreshingRef.current) return; // sudah ada proses refresh berjalan
        refreshingRef.current = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            logout();
            refreshingRef.current = false;
            return;
        }

        // Cek dulu apakah refresh token sendiri sudah expired
        if (isTokenExpired(refreshToken)) {
            console.log('Refresh token expired, logout');
            logout();
            refreshingRef.current = false;
            return;
        }

        try {
            const res = await fetch(`${baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                localStorage.setItem('refreshToken', data.refreshToken);
                console.log('Token berhasil di-refresh');
            } else {
                console.warn('Refresh gagal:', res.status);
                logout();
            }
        } catch (err) {
            console.error('Refresh error:', err);
            // Jangan logout kalau cuma network error sementara
            // User bisa coba lagi saat berikutnya
        } finally {
            refreshingRef.current = false;
        }
    }, [logout]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Langsung cek saat pertama kali hook dipasang
        if (isTokenExpiringSoon(token, 120)) {
            doRefresh();
        }

        // Cek setiap 60 detik
        const interval = setInterval(() => {
            const currentToken = localStorage.getItem('token');
            if (!currentToken) return;

            if (isTokenExpired(currentToken)) {
                // Token sudah expired, coba refresh sekali lagi sebelum logout
                doRefresh();
            } else if (isTokenExpiringSoon(currentToken, 120)) {
                // Token mau expire 2 menit lagi, refresh proaktif
                doRefresh();
            }
        }, 60_000);

        return () => clearInterval(interval);
    }, [doRefresh]);

    return { logout, doRefresh };
}

export default useAuth;
