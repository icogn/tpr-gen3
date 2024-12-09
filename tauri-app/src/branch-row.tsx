import { MouseEventHandler, useState } from 'react';
import { ResolvedBranch } from './types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type BranchRowProps = {
  branch: ResolvedBranch;
};

// When they install it, we need to handle events from tauri at a global level.
// We need to subscribe to the state of updates for this branch from here, but
// the events and state updates have nothing to do with this component.

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
          <DialogFooter>
            <Button>Install</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
