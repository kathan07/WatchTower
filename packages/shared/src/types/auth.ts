export interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

/** User fields exposed to the client after login (JSON wire shape). */
export interface PublicUser {
    id: string;
    username: string;
    email: string;
    /** ISO-8601 from JSON serialization of login response. */
    createdAt: string;
    subscriptionStatus: boolean;
    subscriptionType?: string;
}
