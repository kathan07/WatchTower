import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { PublicUser } from '@repo/shared';

interface UserContextType {
    user: PublicUser | null;
    updateUser: (userData: PublicUser) => void;
    clearUser: () => void;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
    // Persist auth user across reloads; cookie alone is httpOnly so UI needs local mirror.
    const [user, setUser] = useState<PublicUser | null>(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    const updateUser = (userData: PublicUser) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const clearUser = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <UserContext.Provider value={{ user, updateUser, clearUser, isLoading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
