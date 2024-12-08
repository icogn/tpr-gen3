import { useState } from 'react';
import { BranchRow } from './branch-row';
import styles from './settings-modal.module.css';
import { useBranchesQuery } from './state/api-slice';
import { ResolvedBranch } from './types';
import { X } from 'lucide-react';

type SettingsModalProps = {
  onClose(): void;
};

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const branches = useBranchesQuery();

  return (
    <div className={styles.root}>
      <div className="flex px-4 py-4 justify-end">
        <button
          className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-center">
        <div style={{ width: '100%', maxWidth: 300 }}>
          {branches.map((branch) => {
            return <BranchRow key={branch.name} branch={branch} />;
          })}
        </div>
      </div>
    </div>
  );
}
