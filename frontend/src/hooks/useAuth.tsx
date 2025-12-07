import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../api/client';
import type { User } from '../api/client';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
    const [isLoading, setIsLoading] = useState(true);

    // Fetch user profile on mount or when token changes
    useEffect(() => {
        const fetchProfile = async () => {
            if (token) {
                try {
                    const response = await authAPI.getProfile();
                    setUser(response.data);
                } catch (error) {
                    // Token is invalid, clear it
                    localStorage.removeItem('authToken');
                    setToken(null);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        };

        fetchProfile();
    }, [token]);

    // Sync with localStorage changes (e.g., from interceptor)
    useEffect(() => {
        const checkToken = () => {
            const storedToken = localStorage.getItem('authToken');
            if (storedToken !== token) {
                setToken(storedToken);
            }
        };

        // Check periodically for token changes
        const interval = setInterval(checkToken, 1000);
        return () => clearInterval(interval);
    }, [token]);

    const login = async (email: string, password: string): Promise<User> => {
        const response = await authAPI.login(email, password);
        const { token: newToken, user: newUser } = response.data;

        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        setUser(newUser);

        return newUser;
    };

    const logout = async () => {
        try {
            await authAPI.logout(); // Call API first while token is still valid
        } catch {
            // Ignore errors on logout
        }
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user && !!token,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
