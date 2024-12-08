import { BranchRow } from './branch-row';
import styles from './settings-modal.module.css';
import { useBranchesQuery } from './state/api-slice';
import { useGetPokemonByNameQuery } from './state/pokemon-api-slice';
import { ResolvedBranch } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type SettingsModalProps = {
  onClose(): void;
};

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { data, error, isLoading } = useGetPokemonByNameQuery('squirtle');
  const branches = useBranchesQuery();

  return (
    <div className={styles.root}>
      {error ? (
        <>Oh no, there was an error</>
      ) : isLoading ? (
        <>Loading...</>
      ) : data ? (
        <>
          <h3>{data.species.name}</h3>
          <img src={data.sprites.front_shiny} alt={data.species.name} />
        </>
      ) : null}

      <div className="flex px-4 pb-4 ">
        <div role="button" className="pt-5 ml-auto" onClick={onClose}>
          X
        </div>
      </div>
      <div className="flex justify-center">
        <div style={{ width: '100%', maxWidth: 300 }}>
          {branches.map((branch) => {
            return <BranchRow key={branch.name} branch={branch} />;
          })}
        </div>

        {/* <select
          style={{
            color: 'black',
            width: 500,
          }}
        >
          {branches.map((branch) => {
            return <option key={branch.id}>{branch.display_name}</option>;
          })}
        </select> */}
      </div>

      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
