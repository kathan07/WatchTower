import express from 'express';
import { authRoutes } from '@repo/shared';
import { register, login, logout } from '../controllers/auth.controller';

const router = express.Router();

router.post(authRoutes.register, register);
router.post(authRoutes.login, login);
router.get(authRoutes.logout, logout);

export default router;
