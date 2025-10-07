// React hooks for user-related API calls
import { useState, useEffect, useCallback } from "react";
import { getCurrentUser, getUserOverview, getUserNfts, isAuthenticated, getCurrentToken } from "../api/user";

// Hook for current user data
export const useCurrentUser = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = useCallback(async () => {
        if (!isAuthenticated()) {
            setError("Not authenticated");
            return;
        }

        setLoading(true);
        setError(null);

        let mounted = true;
        let backoff = 1500;
        const minSpinnerMs = 600;
        const start = Date.now();
        try {
            while (mounted) {
                try {
                    const data = await getCurrentUser();
                    if (!mounted) break;
                    setUser(data);
                    break;
                } catch (e: any) {
                    const msg = String(e?.message || "");
                    // Keep retrying on any server/network delay while mounted
                    await new Promise((r) => setTimeout(r, backoff));
                    backoff = Math.min(Math.floor(backoff * 1.6) + 500, 30000);
                }
            }
            const elapsed = Date.now() - start;
            if (elapsed < minSpinnerMs) await new Promise((r) => setTimeout(r, minSpinnerMs - elapsed));
        } finally {
            if (mounted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return { user, loading, error, refetch: fetchUser };
};

// Hook for user overview data
export const useUserOverview = () => {
    const [overview, setOverview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOverview = useCallback(async () => {
        if (!isAuthenticated()) {
            setError("Not authenticated");
            return;
        }

        setLoading(true);
        setError(null);

        let mounted = true;
        let backoff = 1500;
        const minSpinnerMs = 600;
        const start = Date.now();
        try {
            while (mounted) {
                try {
                    const data = await getUserOverview();
                    if (!mounted) break;
                    setOverview(data);
                    break;
                } catch (e: any) {
                    await new Promise((r) => setTimeout(r, backoff));
                    backoff = Math.min(Math.floor(backoff * 1.6) + 500, 30000);
                }
            }
            const elapsed = Date.now() - start;
            if (elapsed < minSpinnerMs) await new Promise((r) => setTimeout(r, minSpinnerMs - elapsed));
        } finally {
            if (mounted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview]);

    return { overview, loading, error, refetch: fetchOverview };
};

// Hook for user NFTs with pagination
export const useUserNfts = (page: number = 1, limit: number = 10) => {
    const [nfts, setNfts] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNfts = useCallback(async (newPage?: number, newLimit?: number) => {
        if (!isAuthenticated()) {
            setError("Not authenticated");
            return;
        }

        const currentPage = newPage || page;
        const currentLimit = newLimit || limit;

        setLoading(true);
        setError(null);

        let mounted = true;
        let backoff = 1500;
        const minSpinnerMs = 600;
        const start = Date.now();
        try {
            while (mounted) {
                try {
                    const data = await getUserNfts(currentPage, currentLimit);
                    if (!mounted) break;
                    setNfts(data);
                    break;
                } catch (e: any) {
                    await new Promise((r) => setTimeout(r, backoff));
                    backoff = Math.min(Math.floor(backoff * 1.6) + 500, 30000);
                }
            }
            const elapsed = Date.now() - start;
            if (elapsed < minSpinnerMs) {
                await new Promise((r) => setTimeout(r, minSpinnerMs - elapsed));
            }
        } finally {
            if (mounted) setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        fetchNfts();
    }, [fetchNfts]);

    return { nfts, loading, error, refetch: fetchNfts };
};

// Hook for authentication status
export const useAuthStatus = () => {
    const [isAuth, setIsAuth] = useState(isAuthenticated());
    const [token, setToken] = useState(getCurrentToken());

    useEffect(() => {
        const checkAuth = () => {
            setIsAuth(isAuthenticated());
            setToken(getCurrentToken());
        };

        // Check initially
        checkAuth();

        // Listen for storage changes
        const handleStorageChange = () => checkAuth();
        window.addEventListener('storage', handleStorageChange);

        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return { isAuthenticated: isAuth, token };
};

