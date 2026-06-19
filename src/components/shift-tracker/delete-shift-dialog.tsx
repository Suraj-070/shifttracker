"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFullDate } from "@/lib/utils";
import type { Shift } from "@/types/database.types";

interface DeleteShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  onConfirm: () => void;
}

export function DeleteShiftDialog({ open, onOpenChange, shift, onConfirm }: DeleteShiftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Shift</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the shift on{" "}
            {shift ? formatFullDate(shift.shiftDate) : ""} at {shift?.locationName}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={onConfirm} className="gap-1.5">
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
