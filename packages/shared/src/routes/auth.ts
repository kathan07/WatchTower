export const authBasePath = '/api/auth';

export const authRoutes = {
    register: '/register',
    login: '/login',
    logout: '/logout',
} as const;

export const authApi = {
    register: () => `${authBasePath}${authRoutes.register}`,
    login: () => `${authBasePath}${authRoutes.login}`,
    logout: () => `${authBasePath}${authRoutes.logout}`,
} as const;
