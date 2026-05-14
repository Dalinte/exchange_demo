'use client';

import { useResetAccount } from '@/shared/api/hooks/mutations/use-reset-account';
import { parseApiError } from '@/shared/lib/api-error';
import { usePushToast } from '@/shared/stores/toast-store';

interface ResetModalProps {
  onClose: () => void;
}

export function ResetModal({ onClose }: ResetModalProps) {
  const resetAccount = useResetAccount();
  const pushToast = usePushToast();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--down-bg)',
              color: 'var(--down)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Reset paper-trading account?</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 18 }}>
          This will clear all open orders, order history, trades, and reset all balances to the
          starting amount of{' '}
          <span className="mono" style={{ color: 'var(--text-0)' }}>
            50,000 USDT
          </span>
          . This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={resetAccount.isPending}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={() =>
              resetAccount.mutate(undefined, {
                onSuccess: () => {
                  pushToast({ title: 'Account reset to starting balance' });
                  onClose();
                },
                onError: (error) => pushToast({ title: parseApiError(error), kind: 'error' }),
              })
            }
            disabled={resetAccount.isPending}
            style={{
              background: 'var(--down)',
              borderColor: 'var(--down)',
              color: '#fff',
              opacity: resetAccount.isPending ? 0.6 : 1,
            }}
          >
            {resetAccount.isPending ? 'Resetting…' : 'Reset Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
