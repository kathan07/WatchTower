import {
    userExists,
    createUser,
    createMonitor,
    getActiveSubscriptions,
    SubType,
} from '@repo/prisma';
import type { LoginInput, RegisterInput, PublicUser } from '@repo/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../middleware/error';

export type { LoginInput, RegisterInput };

type UserWithSubscription = Omit<PublicUser, 'createdAt' | 'subscriptionType'> & {
    createdAt: Date;
    subscriptionType?: SubType;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function assertRegisterInput({ username, email, password }: RegisterInput): void {
    if (!username?.trim() || !email?.trim() || !password) {
        throw errorHandler(400, 'Username, email, and password are required');
    }
    if (!EMAIL_RE.test(email)) {
        throw errorHandler(400, 'Invalid email format');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        throw errorHandler(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
}

function assertLoginInput({ email, password }: LoginInput): void {
    if (!email?.trim() || !password) {
        throw errorHandler(400, 'Email and password are required');
    }
}

/**
 * Registers a user and creates an inactive monitor until subscription activates.
 */
export async function registerUser(input: RegisterInput): Promise<void> {
    assertRegisterInput(input);
    const { username, email, password } = input;

    const existingUser = await userExists(email);
    if (existingUser) {
        throw errorHandler(400, 'User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(username.trim(), hashedPassword, email.trim().toLowerCase());
    await createMonitor(user.id);
}

/**
 * Authenticates credentials and returns JWT + sanitized user with subscription flags.
 */
export async function loginUser(
    input: LoginInput
): Promise<{ token: string; user: UserWithSubscription }> {
    assertLoginInput(input);
    const { email, password } = input;

    const validUser = await userExists(email.trim().toLowerCase());
    if (!validUser) {
        throw errorHandler(404, 'User not found');
    }

    const validPassword = await bcrypt.compare(password, validUser.password);
    if (!validPassword) {
        throw errorHandler(401, 'Wrong credentials');
    }

    // SECURITY: Short-lived JWT in httpOnly cookie — do not put secrets in token claims.
    const token = jwt.sign({ id: validUser.id }, process.env.JWT_SECRET as string, {
        expiresIn: '1d',
    });

    const { password: _, ...baseUser } = validUser;
    const subscription = await getActiveSubscriptions(baseUser.id, new Date());

    const user: UserWithSubscription =
        subscription === null
            ? { ...baseUser, subscriptionStatus: false }
            : {
                  ...baseUser,
                  subscriptionStatus: true,
                  subscriptionType: subscription.type,
              };

    return { token, user };
}
