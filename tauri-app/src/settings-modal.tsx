import styles from './settings-modal.module.css';

type SettingsModalProps = {
  open: boolean;
};

export default function SettingsModal({ open }: SettingsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className="pt-5">X</div>
    </div>
  );
}
