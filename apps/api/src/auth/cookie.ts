import type { CookieOptions } from 'express';
import { Prisma } from '../../generated/prisma/client';

export const ACCOUNT_COOKIE_NAME = 'account_id';
export const ACCOUNT_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export const STARTING_USDT = new Prisma.Decimal(10000);

export function accountCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ACCOUNT_COOKIE_MAX_AGE_MS,
  };
}
