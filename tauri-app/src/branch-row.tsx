import { ResolvedBranch } from './types';

type BranchRowProps = {
  branch: ResolvedBranch;
};

export function BranchRow({ branch }: BranchRowProps) {
  return (
    <div className="border px-4 py-2 mb-2 rounded cursor-pointer hover:bg-gray-700">
      {branch.displayName}
    </div>
  );
}
