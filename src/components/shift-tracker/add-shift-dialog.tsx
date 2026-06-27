"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
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
  parseStationTax,
  parseStationUserNote,
} from "@/types/database.types";
import type {
  ShiftStatus,
  ShiftCreateInput,
  Shift,
} from "@/types/database.types";

type JobKind = "Hall" | "Station";

// ─── Shared status toggle ────────────────────────────────────────────────────

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

// ─── Hall form (existing, untouched) ─────────────────────────────────────────

interface HallFormProps {
  shifts: Shift[];
  defaultPerson?: string;
  defaultLocation?: string;
  isSubmitting: boolean;
  onSubmit: (data: ShiftCreateInput) => void;
  onCancel: () => void;
}

function HallForm({
  shifts,
  defaultPerson,
  defaultLocation,
  isSubmitting,
  onSubmit,
  onCancel,
}: HallFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [coveringFor, setCoveringFor] = useState(defaultPerson ?? "");
  const [formDate, setFormDate] = useState(today);
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [amount, setAmount] = useState(DEFAULT_SHIFT_AMOUNT);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ShiftStatus>("Unpaid");

  const hallShifts = useMemo(() => shifts.filter((s) => !isStationShift(s)), [shifts]);

  const personSuggestions = useMemo(
    () => buildSuggestions(hallShifts.map((s) => s.coveringFor), DEFAULT_COVER_NAMES),
    [hallShifts],
  );
  const locationSuggestions = useMemo(
    () => buildSuggestions(hallShifts.map((s) => s.locationName), DEFAULT_LOCATIONS),
    [hallShifts],
  );

  const personPills = useMemo(() => {
    const fromShifts = [...new Set(hallShifts.map((s) => s.coveringFor))];
    const extra = DEFAULT_COVER_NAMES.filter((n) => !fromShifts.includes(n));
    return [...fromShifts, ...extra].slice(0, 12);
  }, [hallShifts]);

  const locationPills = useMemo(() => {
    const fromShifts = [...new Set(hallShifts.map((s) => s.locationName))];
    const extra = DEFAULT_LOCATIONS.filter((l) => !fromShifts.includes(l));
    return [...fromShifts, ...extra].slice(0, 10);
  }, [hallShifts]);

  const handleSubmit = () => {
    if (!coveringFor || !formDate || !location || !amount) return;
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
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !coveringFor || !formDate || !location || !amount}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : (
            <Plus className="w-4 h-4 mr-1.5" />
          )}
          Add Shift
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Station form ─────────────────────────────────────────────────────────────

const RATE_KEYS: StationRateKey[] = ["Afternoon", "Saturday", "Sunday"];

interface StationFormProps {
  shifts: Shift[];
  isSubmitting: boolean;
  onSubmit: (data: ShiftCreateInput) => void;
  onCancel: () => void;
}

function StationForm({ shifts, isSubmitting, onSubmit, onCancel }: StationFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [stationName, setStationName] = useState("");
  const [rateKey, setRateKey] = useState<StationRateKey>("Afternoon");
  const [formDate, setFormDate] = useState(today);
  const [hours, setHours] = useState("5");
  const [gross, setGross] = useState("");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ShiftStatus>("Unpaid");

  const grossTouched = useRef(false);
  const taxTouched = useRef(false);

  // Past station names for autocomplete
  const pastStationNames = useMemo(() => {
    const seen = new Set<string>();
    for (const s of shifts) {
      if (isStationShift(s) && s.coveringFor) seen.add(s.coveringFor);
    }
    return Array.from(seen).sort();
  }, [shifts]);

  // Auto-calc gross from hours + rate
  useEffect(() => {
    if (grossTouched.current) return;
    const h = Number(hours) || 0;
    const g = h * STATION_RATES[rateKey];
    setGross(g.toFixed(2));
  }, [hours, rateKey]);

  // Auto-calc tax from gross
  useEffect(() => {
    if (taxTouched.current) return;
    const g = Number(gross) || 0;
    setTax((g * STATION_TAX_RATE).toFixed(2));
  }, [gross]);

  const grossNum = Number(gross) || 0;
  const taxNum = Number(tax) || 0;
  const net = Math.max(0, grossNum - taxNum);

  const canSubmit =
    stationName.trim().length > 0 &&
    formDate.length > 0 &&
    Number(hours) > 0 &&
    grossNum > 0;

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
      {/* Station name — pills + combo input */}
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
          placeholder={pastStationNames.length > 0 ? "Or type a new station…" : "e.g. Central, Redfern, Sydenham..."}
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
              onClick={() => {
                grossTouched.current = false;
                taxTouched.current = false;
                setRateKey(k);
              }}
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
            onChange={(e) => {
              grossTouched.current = false;
              taxTouched.current = false;
              setHours(e.target.value);
            }}
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
            value={gross}
            onChange={(e) => {
              grossTouched.current = true;
              setGross(e.target.value);
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
            value={tax}
            onChange={(e) => {
              taxTouched.current = true;
              setTax(e.target.value);
            }}
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

      {/* Notes + Status */}
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

      <div className="space-y-2">
        <Label>Status</Label>
        <StatusToggle value={status} onChange={setStatus} />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogClose>
        <Button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          ) : (
            <Train className="w-4 h-4 mr-1.5" />
          )}
          Add Station Shift
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Top-level dialog ─────────────────────────────────────────────────────────

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

  // Reset to Hall whenever dialog opens
  useEffect(() => {
    if (open) setJobKind("Hall");
  }, [open]);

  const handleSubmit = (data: ShiftCreateInput) => {
    onSubmit(data);
  };

  const handleCancel = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Shift</DialogTitle>
          <DialogDescription>
            Choose a shift type and fill in the details.
          </DialogDescription>
        </DialogHeader>

        {/* Hall / Station toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
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
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        ) : (
          <StationForm
            shifts={shifts}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}