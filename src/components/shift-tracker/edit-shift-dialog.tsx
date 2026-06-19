"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Save, User, MapPin, StickyNote, Check } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ComboInput } from "./combo-input";
import { DEFAULT_LOCATIONS, DEFAULT_COVER_NAMES } from "@/lib/constants";
import { getDayFromDate, buildSuggestions } from "@/lib/utils";
import type { Shift, ShiftStatus, ShiftCreateInput } from "@/types/database.types";

interface EditShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  shifts: Shift[];
  onSave: (id: string, data: Partial<ShiftCreateInput>) => void;
  isSubmitting: boolean;
}

export function EditShiftDialog({ open, onOpenChange, shift, shifts, onSave, isSubmitting }: EditShiftDialogProps) {
  const [editCoveringFor, setEditCoveringFor] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<ShiftStatus>("Unpaid");

  const personSuggestions = useMemo(
    () => buildSuggestions(shifts.map((s) => s.coveringFor), DEFAULT_COVER_NAMES),
    [shifts]
  );
  const locationSuggestions = useMemo(
    () => buildSuggestions(shifts.map((s) => s.locationName), DEFAULT_LOCATIONS),
    [shifts]
  );

  const personPills = useMemo(() => {
    const fromShifts = [...new Set(shifts.map((s) => s.coveringFor))];
    const extra = DEFAULT_COVER_NAMES.filter((n) => !fromShifts.includes(n));
    return [...fromShifts, ...extra].slice(0, 12);
  }, [shifts]);

  const locationPills = useMemo(() => {
    const fromShifts = [...new Set(shifts.map((s) => s.locationName))];
    const extra = DEFAULT_LOCATIONS.filter((l) => !fromShifts.includes(l));
    return [...fromShifts, ...extra].slice(0, 10);
  }, [shifts]);

  const handleOpenChange = (v: boolean) => {
    if (v && shift) {
      setEditCoveringFor(shift.coveringFor);
      setEditDate(shift.shiftDate);
      setEditLocation(shift.locationName);
      setEditAmount(shift.amountEarned);
      setEditNotes(shift.notes ?? "");
      setEditStatus(shift.status);
    }
    onOpenChange(v);
  };

  const handleSave = () => {
    if (!shift || !editCoveringFor || !editDate || !editLocation || !editAmount) return;
    onSave(shift.id, {
      coveringFor: editCoveringFor,
      shiftDate: editDate,
      locationName: editLocation,
      notes: editNotes.trim(),
      shiftDay: getDayFromDate(editDate),
      amountEarned: parseFloat(editAmount).toFixed(2),
      status: editStatus,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogDescription>Update shift details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* Covering For — pills + fallback combo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Covering For</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {personPills.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setEditCoveringFor(editCoveringFor === name ? "" : name)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    editCoveringFor === name
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-background border-border text-foreground hover:border-emerald-400"
                  }`}
                >
                  {name.split(" ")[0]}
                  {editCoveringFor === name && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <ComboInput
              value={editCoveringFor}
              onChange={setEditCoveringFor}
              suggestions={personSuggestions}
              placeholder="Or type a name…"
              icon={<User className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Location — pills + fallback combo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {locationPills.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setEditLocation(editLocation === loc ? "" : loc)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    editLocation === loc
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-background border-border text-foreground hover:border-emerald-400"
                  }`}
                >
                  {loc}
                  {editLocation === loc && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <ComboInput
              value={editLocation}
              onChange={setEditLocation}
              suggestions={locationSuggestions}
              placeholder="Or type a location…"
              icon={<MapPin className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          </div>

          {/* Amount + Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2 h-9">
                {(["Unpaid", "Paid"] as ShiftStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditStatus(s)}
                    className={`flex-1 rounded-md text-sm font-medium border transition-all ${
                      editStatus === s
                        ? s === "Paid"
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-rose-500 text-white border-rose-500"
                        : "bg-background border-input text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Anything worth remembering about this shift..."
              className="min-h-20 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSubmitting || !editCoveringFor || !editDate || !editLocation || !editAmount}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}