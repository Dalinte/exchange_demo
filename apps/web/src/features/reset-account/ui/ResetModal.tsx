'use client';

import { toast } from 'sonner';
import { useResetAccount } from '../api/use-reset-account';
import { parseApiError } from '@/shared/api/api-error';

interface ResetModalProps {
  onClose: () => void;
}

export function ResetModal({ onClose }: ResetModalProps) {
  const resetAccount = useResetAccount();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-down-bg text-down text-base font-bold">
            !
          </div>
          <div className="text-[15px] font-semibold">Reset paper-trading account?</div>
        </div>
        <div className="mb-[18px] text-[12px] leading-[1.5] text-text-2">
          This will clear all open orders, order history, trades, and reset all balances to the
          starting amount of <span className="mono text-text-0">50,000 USDT</span>. This action
          cannot be undone.
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose} disabled={resetAccount.isPending}>
            Cancel
          </button>
          <button
            className="btn bg-down border-down text-white disabled:opacity-60"
            onClick={() =>
              resetAccount.mutate(undefined, {
                onSuccess: () => {
                  toast.success('Account reset to starting balance');
                  onClose();
                },
                onError: (error) => toast.error(parseApiError(error)),
              })
            }
            disabled={resetAccount.isPending}
          >
            {resetAccount.isPending ? 'Resetting…' : 'Reset Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
