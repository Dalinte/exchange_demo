'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { ResetModal } from './reset-modal';

export function ResetAccountButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        data-tip="Reset paper-trading balance"
      >
        <RotateCcw size={13} /> Reset
      </Button>
      {isModalOpen && <ResetModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
