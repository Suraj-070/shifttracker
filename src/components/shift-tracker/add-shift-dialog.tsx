"use client";

import React, { useMemo, useState } from "react";
import { Plus, Loader2, User, MapPin, StickyNote, Check, Train } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ComboInput } from "./combo-input";
import {
  DEFAULT_LOCATIONS,
  DEFAULT_COVER_NAMES,
  DEFAULT_SHIFT_AMOUNT,
  STATION_RATES,
  STATION_TAX_RATE,
  type StationRateKey,
} from "@/lib/constants";
import { getDayFromDate, buildSuggestions } from "@/lib/utils";
import {
  STATION_LOCATION,
  buildStationNotes,
  isStationShift,
} from "@/types/database.types";
import type { ShiftStatus, ShiftCreateInput, Shift } from "@/types/database.types";

type JobKind = "Hall" | "Station";

// ─── Status toggle ─────────────────────────────────────────────────────────────

function StatusToggle({
  value,
  onChange,
}: {
  value: ShiftStatus;
  onChange: (v: ShiftStatus) => void;
}) {
  return (
    <div className="flex gap-2 h-9">
      {(["Unpaid", "Paid"] as ShiftStatus[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`flex-1 rounded-md text-sm font-medium border transition-all ${
            value === s
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
  );
}

// ─── Hall form ─────────────────────────────────────────────────────────────────

function HallForm({
  shifts,
  defaultPerson,
  defaultLocation,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  shifts: Shift[];
  defaultPerson?: string;
  defaultLocation?: string;
  isSubmitting: boolean;
  onSubmit: (data: ShiftCreateInput) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [coveringFor, setCoveringFor] = useState(defaultPerson ?? "");
  const [formDate, setFormDate] = useState(today);
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [amount, setAmount] = useState(DEFAULT_SHIFT_AMOUNT);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ShiftStatus>("Unpaid");

  const hallShifts = useMemo(
    () => shifts.filter((s) => !isStationShift(s)),
    [shifts],
  );

  const personSuggestions = useMemo(
    () => buildSuggestions(hallShifts.map((s) => s.coveringFor), DEFAULT_COVER_NAMES),
    [hallShifts],
  );
  const locationSuggestions = useMemo(
    () => buildSuggestions(hallShifts.map((s) => s.locationName), DEFAULT_LOCATIONS),
    [hallShifts],
  );
  const personPills = useMemo(() => {
    const from = [...new Set(hallShifts.map((s) => s.coveringFor))];
    const extra = DEFAULT_COVER_NAMES.filter((n) => !from.includes(n));
    return [...from, ...extra].slice(0, 12);
  }, [hallShifts]);
  const locationPills = useMemo(() => {
    const from = [...new Set(hallShifts.map((s) => s.locationName))];
    const extra = DEFAULT_LOCATIONS.filter((l) => !from.includes(l));
    return [...from, ...extra].slice(0, 10);
  }, [hallShifts]);

  const canSubmit = !!coveringFor && !!formDate && !!location && !!amount;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      coveringFor,
      shiftDate: formDate,
      locationName: location,
      notes: notes.trim(),
      shiftDay: getDayFromDate(formDate),
      amountEarned: parseFloat(amount).toFixed(2),
      hoursWorked: 0,
      status,
    });
  };

  return (
    <div className="space-y-5 py-2">
      {/* Covering For */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Covering For
        </Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {personPills.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCoveringFor(coveringFor === name ? "" : name)}
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

      {/* Location */}
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

      {/* Amount + Status */}
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
          <StatusToggle value={status} onChange={setStatus} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" /> Notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering about this shift..."
          className="min-h-20 resize-none"
        />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
          {isSubmitting
            ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            : <Plus className="w-4 h-4 mr-1.5" />}
          Add Shift
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Station form ──────────────────────────────────────────────────────────────

const RATE_KEYS: StationRateKey[] = ["Afternoon", "Saturday", "Sunday"];

function StationForm({
  shifts,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  shifts: Shift[];
  isSubmitting: boolean;
  onSubmit: (data: ShiftCreateInput) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [stationName, setStationName] = useState("");
  const [rateKey, setRateKey] = useState<StationRateKey>("Afternoon");
  const [formDate, setFormDate] = useState(today);
  const [hours, setHours] = useState("5");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ShiftStatus>("Unpaid");

  // null = use auto-calc, string = user has manually overridden
  const [grossOverride, setGrossOverride] = useState<string | null>(null);
  const [taxOverride, setTaxOverride] = useState<string | null>(null);

  // Derived values — computed during render, no effects needed
  const autoGross = (Number(hours) || 0) * STATION_RATES[rateKey];
  const displayGross = grossOverride ?? autoGross.toFixed(2);
  const autoTax = (Number(displayGross) || 0) * STATION_TAX_RATE;
  const displayTax = taxOverride ?? autoTax.toFixed(2);

  const grossNum = Number(displayGross) || 0;
  const taxNum = Number(displayTax) || 0;
  const net = Math.max(0, grossNum - taxNum);

  const pastStationNames = useMemo(() => {
    const seen = new Set<string>();
    for (const s of shifts) {
      if (isStationShift(s) && s.coveringFor) seen.add(s.coveringFor);
    }
    return Array.from(seen).sort();
  }, [shifts]);

  const canSubmit =
    stationName.trim().length > 0 &&
    !!formDate &&
    Number(hours) > 0 &&
    grossNum > 0;

  // Changing rate or hours resets overrides so auto-calc resumes
  const changeRateKey = (k: StationRateKey) => {
    setRateKey(k);
    setGrossOverride(null);
    setTaxOverride(null);
  };
  const changeHours = (h: string) => {
    setHours(h);
    setGrossOverride(null);
    setTaxOverride(null);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      coveringFor: stationName.trim(),
      shiftDate: formDate,
      locationName: STATION_LOCATION,
      notes: buildStationNotes(taxNum, notes),
      shiftDay: getDayFromDate(formDate),
      amountEarned: grossNum.toFixed(2),
      hoursWorked: Number(hours) || 0,
      status,
    });
  };

  return (
    <div className="space-y-5 py-2">
      {/* Station name */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Train className="w-3.5 h-3.5" /> Station Name
        </Label>
        {pastStationNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pastStationNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setStationName(stationName === name ? "" : name)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  stationName === name
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-background border-border text-foreground hover:border-blue-400"
                }`}
              >
                {name}
                {stationName === name && <Check className="w-3 h-3" />}
              </button>
            ))}
          </div>
        )}
        <Input
          list="station-name-list"
          value={stationName}
          onChange={(e) => setStationName(e.target.value)}
          placeholder={
            pastStationNames.length > 0
              ? "Or type a new station…"
              : "e.g. Central, Redfern, Sydenham..."
          }
        />
        <datalist id="station-name-list">
          {pastStationNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      {/* Rate pills */}
      <div className="space-y-2">
        <Label>Shift Type</Label>
        <div className="flex gap-2">
          {RATE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => changeRateKey(k)}
              className={`flex-1 flex flex-col items-center py-2 rounded-lg border text-xs font-medium transition-all ${
                rateKey === k
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-background border-border text-foreground hover:border-blue-400"
              }`}
            >
              <span>{k}</span>
              <span className={`text-[10px] ${rateKey === k ? "text-blue-100" : "text-muted-foreground"}`}>
                ${STATION_RATES[k].toFixed(2)}/hr
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Date + Hours */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Hours Worked</Label>
          <Input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={(e) => changeHours(e.target.value)}
          />
        </div>
      </div>

      {/* Gross + Tax */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Gross Amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={displayGross}
            onChange={(e) => {
              setGrossOverride(e.target.value);
              setTaxOverride(null); // re-calc tax from new gross
            }}
          />
          <p className="text-xs text-muted-foreground">Auto-calc. Editable.</p>
        </div>
        <div className="space-y-2">
          <Label>Tax Withheld ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={displayTax}
            onChange={(e) => setTaxOverride(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Auto: {(STATION_TAX_RATE * 100).toFixed(1)}%. Editable.
          </p>
        </div>
      </div>

      {/* Net take-home */}
      <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Net take-home</p>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-500">Gross − tax</p>
        </div>
        <p className="text-xl font-semibold text-blue-700 dark:text-blue-400">
          ${net.toFixed(2)}
        </p>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <StickyNote className="w-3.5 h-3.5" /> Notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember about this shift..."
          className="min-h-20 resize-none"
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <StatusToggle value={status} onChange={setStatus} />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
          {isSubmitting
            ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            : <Train className="w-4 h-4 mr-1.5" />}
          Add Station Shift
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Top-level dialog ──────────────────────────────────────────────────────────

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
  const [jobKind, setJobKind] = useState<JobKind>("Hall");
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* key={String(open)} remounts content on open → resets jobKind to "Hall" */}
      <DialogContent key={String(open)} className={
        isMobile
          ? "fixed bottom-0 left-0 right-0 top-auto max-w-full rounded-t-3xl rounded-b-none translate-x-0 translate-y-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom max-h-[92vh] overflow-y-auto p-0"
          : "sm:max-w-md max-h-[90vh] overflow-y-auto"
      }>
      {isMobile && (
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-background z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      )}
        <div className="px-4 sm:px-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add New Shift</DialogTitle>
          <DialogDescription>
            Choose a shift type and fill in the details.
          </DialogDescription>
        </DialogHeader>
        </div>

        <div className="px-4 sm:px-0 pb-4 space-y-4">
        {/* Hall / Station toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {(["Hall", "Station"] as JobKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setJobKind(k)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                jobKind === k
                  ? k === "Hall"
                    ? "bg-background text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                    : "bg-background text-blue-700 shadow-sm ring-1 ring-blue-200"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "Hall" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Hall
                </>
              ) : (
                <>
                  <Train className="w-3.5 h-3.5" />
                  Station
                </>
              )}
            </button>
          ))}
        </div>

        {jobKind === "Hall" ? (
          <HallForm
            shifts={shifts}
            defaultPerson={defaultPerson}
            defaultLocation={defaultLocation}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <StationForm
            shifts={shifts}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
