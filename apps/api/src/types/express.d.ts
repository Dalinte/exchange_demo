import type { Account, User } from '../../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User & { account: Account };
    }
  }
}

export {};
