import argon2 from 'argon2';
import type { AuthResponse, LoginInput, RegisterInput } from '@hafalati/shared';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { toUserDTO } from '../http/serialize.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.js';

function tokensFor(user: { id: string; role: string }) {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role as never }),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { email: true },
  });
  if (existing) {
    throw AppError.conflict('user_exists', 'Email or phone already registered');
  }

  const passwordHash = await argon2.hash(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      passwordHash,
      locale: input.locale ?? 'ar',
      role: 'CUSTOMER',
    },
  });

  return { user: toUserDTO(user), ...tokensFor(user) };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw AppError.unauthorized('invalid_credentials', 'Invalid email or password');

  const ok = await argon2.verify(user.passwordHash, input.password);
  if (!ok) throw AppError.unauthorized('invalid_credentials', 'Invalid email or password');

  return { user: toUserDTO(user), ...tokensFor(user) };
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('invalid_token', 'Invalid refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw AppError.unauthorized('invalid_token', 'Invalid refresh token');

  return { user: toUserDTO(user), ...tokensFor(user) };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('user_not_found', 'User not found');
  return toUserDTO(user);
}
