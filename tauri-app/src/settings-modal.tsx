import styles from './settings-modal.module.css';
import { Branch } from './types';

type SettingsModalProps = {
  branches: Branch[];
  onClose(): void;
};

export default function SettingsModal({
  branches,
  onClose,
}: SettingsModalProps) {
  return (
    <div className={styles.root}>
      <div className="flex px-4 pb-4 ">
        <div role="button" className="pt-5 ml-auto" onClick={onClose}>
          X
        </div>
      </div>
      <div>
        <select
          style={{
            color: 'black',
            width: 500,
          }}
        >
          {branches.map((branch) => {
            return <option key={branch.id}>{branch.display_name}</option>;
          })}
        </select>
      </div>
    </div>
  );
}
