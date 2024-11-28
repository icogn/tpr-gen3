import styles from './settings-modal.module.css';
import { useGetPokemonByNameQuery } from './state/pokemon-api-slice';
import { Branch } from './types';

type SettingsModalProps = {
  branches: Branch[];
  onClose(): void;
};

export default function SettingsModal({
  branches,
  onClose,
}: SettingsModalProps) {
  const { data, error, isLoading } = useGetPokemonByNameQuery('squirtle');

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
