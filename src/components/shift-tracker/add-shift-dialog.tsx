"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, User, MapPin, StickyNote, Check } from "lucide-react";
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
import {
  DEFAULT_LOCATIONS,
  DEFAULT_COVER_NAMES,
  DEFAULT_SHIFT_AMOUNT,
} from "@/lib/constants";
import { getDayFromDate, buildSuggestions } from "@/lib/utils";
import type {
  ShiftStatus,
  ShiftCreateInput,
  Shift,
} from "@/types/database.types";

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShiftCreateInput) => void;
  isSubmitting: boolean;
  shifts: Shift[];
  defaultPerson?: string;
  defaultLocation?: string;
}
export function AddShiftDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  shifts,
  defaultPerson,
  defaultLocation,
}: AddShiftDialogProps) {
  const today = new Date().toISOString().split("T")[0];
  const [coveringFor, setCoveringFor] = useState(defaultPerson ?? "");
  const [formDate, setFormDate] = useState(today);
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [amount, setAmount] = useState(DEFAULT_SHIFT_AMOUNT);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ShiftStatus>("Unpaid");

  useEffect(() => {
    if (open) {
      setCoveringFor(defaultPerson ?? "");
      setLocation(defaultLocation ?? "");
      setFormDate(new Date().toISOString().split("T")[0]);
      setAmount(DEFAULT_SHIFT_AMOUNT);
      setNotes("");
      setStatus("Unpaid");
    }
  }, [open, defaultPerson, defaultLocation]);

  const personSuggestions = useMemo(
    () =>
      buildSuggestions(
        shifts.map((s) => s.coveringFor),
        DEFAULT_COVER_NAMES,
      ),
    [shifts],
  );
  const locationSuggestions = useMemo(
    () =>
      buildSuggestions(
        shifts.map((s) => s.locationName),
        DEFAULT_LOCATIONS,
      ),
    [shifts],
  );

  // Deduplicated pill lists from actual shifts + defaults
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

  const resetForm = () => {
    setCoveringFor("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setLocation("");
    setAmount(DEFAULT_SHIFT_AMOUNT);
    setNotes("");
    setStatus("Unpaid");
  };

  const handleSubmit = () => {
    if (!coveringFor || !formDate || !location || !amount) return;
    onSubmit({
      coveringFor,
      shiftDate: formDate,
      locationName: location,
      notes: notes.trim(),
      shiftDay: getDayFromDate(formDate),
      amountEarned: parseFloat(amount).toFixed(2),
      status,
    });
    resetForm();
  };

  const handleClose = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Shift</DialogTitle>
          <DialogDescription>
            Record who you covered for, where, and what you earned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Covering For — pills + fallback combo input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Covering For
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {personPills.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() =>
                    setCoveringFor(coveringFor === name ? "" : name)
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    coveringFor === name
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-background border-border text-foreground hover:border-emerald-400"
                  }`}
                >
                  {name.split(" ")[0]}
                  {coveringFor === name && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <ComboInput
              value={coveringFor}
              onChange={setCoveringFor}
              suggestions={personSuggestions}
              placeholder="Or type a new name…"
              icon={<User className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Location — pills + fallback combo input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Location
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {locationPills.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(location === loc ? "" : loc)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    location === loc
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-background border-border text-foreground hover:border-emerald-400"
                  }`}
                >
                  {loc}
                  {location === loc && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <ComboInput
              value={location}
              onChange={setLocation}
              suggestions={locationSuggestions}
              placeholder="Or type a new location…"
              icon={<MapPin className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          {/* Amount + Status side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={DEFAULT_SHIFT_AMOUNT}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2 h-9">
                {(["Unpaid", "Paid"] as ShiftStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 rounded-md text-sm font-medium border transition-all ${
                      status === s
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
            <Label className="flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Notes{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth remembering about this shift..."
              className="min-h-20 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting || !coveringFor || !formDate || !location || !amount
            }
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" />
            )}
            Add Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
