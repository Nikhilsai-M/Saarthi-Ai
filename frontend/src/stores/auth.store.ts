import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    fullName: string;
    name?: string;
    role: string;
    institute?: string;
    avatar?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isRestoring: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    signup: (data: { name: string; email: string; password: string; confirmPassword: string; institute?: string; role?: string }) => Promise<void>;
    logout: () => Promise<void>;
    restoreSession: () => Promise<void>;
    setUser: (user: User) => void;
    clearSession: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function getErrorMessage(data: any, fallback: string): string {
    if (data?.error && typeof data.error === 'object' && typeof data.error.message === 'string') {
        return data.error.message;
    }
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.details) && data.details.length) {
        return data.details.map((d: any) => d?.msg ?? d?.message ?? String(d)).join('. ');
    }
    return fallback;
}

const authHeader = (t: string | null): Record<string, string> => t ? { 'Authorization': `Bearer ${t}` } : {};
const ngrokHeader = (): Record<string, string> => API_URL.includes('ngrok') ? { 'ngrok-skip-browser-warning': '1' } : {};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            isRestoring: true,

            login: async (email: string, password: string, rememberMe = false) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_URL}/auth/signin`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json', ...ngrokHeader() },
                        body: JSON.stringify({ email, password, remember_me: rememberMe }),
                    });
                    const contentType = res.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        throw new Error('Server error. Please try again later.');
                    }
                    const data = await res.json();
                    if (!res.ok) throw new Error(getErrorMessage(data, 'Login failed'));
                    const userData = data.data || data;
                    const user = userData.user;
                    if (user && !user.name) user.name = user.fullName || user.full_name || 'User';
                    set({ user, token: userData.access_token ?? userData.token, refreshToken: userData.refresh_token ?? null, isAuthenticated: true, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            signup: async (formData) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_URL}/auth/signup`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json', ...ngrokHeader() },
                        body: JSON.stringify({
                            fullName: formData.name,
                            email: formData.email,
                            password: formData.password,
                            confirmPassword: formData.confirmPassword,
                            institute: formData.institute || undefined,
                            role: formData.role === 'teacher' ? 'teacher' : 'student',
                        }),
                    });
                    const contentType = res.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        throw new Error('Server error. Please try again later.');
                    }
                    const data = await res.json();
                    if (!res.ok) {
                        const msg = getErrorMessage(data, 'Signup failed');
                        if (msg.toLowerCase().includes('already exists') && formData.role === 'teacher') {
                            throw new Error('An account with this email already exists. Sign in above, or use a different email to create a teacher account.');
                        }
                        throw new Error(msg);
                    }
                    const userData = data.data || data;
                    const user = userData.user;
                    if (user) {
                        if (!user.name) user.name = user.fullName || user.full_name || 'User';
                        const requestedRole = formData.role === 'teacher' ? 'teacher' : 'student';
                        user.role = (user.role === 'teacher' || user.role === 'admin') ? user.role : requestedRole;
                    }
                    set({ user, token: userData.access_token ?? userData.token, refreshToken: userData.refresh_token ?? null, isAuthenticated: true, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
                } finally {
                    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
                }
            },

            restoreSession: async () => {
                set({ isRestoring: true });
                try {
                    const stored = (() => { try { const s = JSON.parse(localStorage.getItem('saarthi-auth') || '{}')?.state; return { token: s?.token ?? null, refreshToken: s?.refreshToken ?? null }; } catch { return { token: null, refreshToken: null }; } })();
                    let res = await fetch(`${API_URL}/auth/me`, { credentials: 'include', headers: { ...authHeader(stored.token), ...ngrokHeader() } });
                    if (res.status === 401 && stored.refreshToken) {
                        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json', ...ngrokHeader() },
                            body: JSON.stringify({ refresh_token: stored.refreshToken }),
                        });
                        if (refreshRes.ok) {
                            const refreshData = await refreshRes.json();
                            const rd = refreshData?.data || refreshData;
                            const newToken = rd?.access_token ?? rd?.token ?? stored.token;
                            const newRefresh = rd?.refresh_token ?? stored.refreshToken;
                            set({ token: newToken, refreshToken: newRefresh });
                            res = await fetch(`${API_URL}/auth/me`, { credentials: 'include', headers: { ...authHeader(newToken), ...ngrokHeader() } });
                        }
                    }
                    if (!res.ok) {
                        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isRestoring: false });
                        return;
                    }
                    const user = await res.json();
                    if (user && !user.name) user.name = user.fullName || user.full_name || 'User';
                    set({ user, isAuthenticated: true, isRestoring: false });
                } catch {
                    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isRestoring: false });
                }
            },

            setUser: (user: User) => {
                set({ user });
            },
            clearSession: () => {
                set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isRestoring: false, isLoading: false });
            },
        }),
        {
            name: 'saarthi-auth',
            partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated }),
        }
    )
);
