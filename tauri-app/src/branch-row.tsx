import { MouseEventHandler, useState } from 'react';
import { ResolvedBranch } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type BranchRowProps = {
  branch: ResolvedBranch;
};

export function BranchRow({ branch }: BranchRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="border px-4 py-2 mb-2 rounded cursor-pointer hover:bg-gray-700"
        onClick={() => {
          setOpen(true);
        }}
      >
        {branch.displayName}
      </div>

      <Dialog
        open={open}
        onOpenChange={(val) => {
          console.log(`val: ${val}`);
          setOpen(val);
        }}
      >
        {/* <DialogTrigger>Open</DialogTrigger> */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>{`${branch.displayName}`}</DialogDescription>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
