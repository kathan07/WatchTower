import { createContext, useContext, useState, useEffect } from 'react';

// Define the shape of the auth context
const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    loading: true,
    login: async () => {},
    logout: async () => {},
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in when component mounts
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            // Add your authentication check logic here
            // Example: Check local storage or make an API call
            const token = localStorage.getItem('token');
            if (token) {
                // Validate token and get user data
                // setUser(userData);
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            // Add your login logic here
            // Example: API call to login endpoint
            // const response = await api.login(credentials);
            // setUser(response.user);
            // localStorage.setItem('token', response.token);
        } catch (error) {
            throw new Error('Login failed');
        }
    };

    const logout = async () => {
        try {
            // Add your logout logic here
            localStorage.removeItem('token');
            setUser(null);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const value = {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};</AuthContext.Provider>