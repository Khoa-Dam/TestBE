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

        try {
            const userData = await getCurrentUser();
            setUser(userData);
        } catch (err: any) {
            setError(err.message || "Failed to fetch user data");
            console.error("Error fetching current user:", err);
        } finally {
            setLoading(false);
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

        try {
            const overviewData = await getUserOverview();
            setOverview(overviewData);
        } catch (err: any) {
            setError(err.message || "Failed to fetch user overview");
            console.error("Error fetching user overview:", err);
        } finally {
            setLoading(false);
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

        try {
            const nftsData = await getUserNfts(currentPage, currentLimit);
            setNfts(nftsData);
        } catch (err: any) {
            setError(err.message || "Failed to fetch user NFTs");
            console.error("Error fetching user NFTs:", err);
        } finally {
            setLoading(false);
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
