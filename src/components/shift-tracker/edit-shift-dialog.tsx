"use client";

import React, { useMemo, useRef, useState } from "react";
import { Loader2, Save, User, MapPin, StickyNote, Check, UserX } from "lucide-react";
import { ComboInput } from "./combo-input";
import {
  DEFAULT_LOCATIONS,
  DEFAULT_COVER_NAMES,
  STATION_RATES,
  STATION_TAX_RATE,
  type StationRateKey,
} from "@/lib/constants";
import { getDayFromDate, buildSuggestions } from "@/lib/utils";
import {
  isStationShift,
  buildStationNotes,
  parseStationTax,
  parseStationUserNote,
  STATION_LOCATION,
} from "@/types/database.types";
import type { Shift, ShiftStatus, ShiftCreateInput } from "@/types/database.types";

// ─── Shared status toggle ─────────────────────────────────────────────────────

function StatusToggle({ value, onChange }: { value: ShiftStatus; onChange: (v: ShiftStatus) => void }) {
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

// ─── Hall edit form ───────────────────────────────────────────────────────────

function HallEditForm({
  shift,
  shifts,
  isSubmitting,
  onSave,
  onCancel,
}: {
  shift: Shift;
  shifts: Shift[];
  isSubmitting: boolean;
  onSave: (id: string, data: Partial<ShiftCreateInput>) => void;
  onCancel: () => void;
}) {
  const [coveringFor, setCoveringFor] = useState(shift.coveringFor);
  const [date, setDate] = useState(shift.shiftDate);
  const [location, setLocation] = useState(shift.locationName);
  const [amount, setAmount] = useState(shift.amountEarned);
  const [notes, setNotes] = useState(shift.notes ?? "");
  const [status, setStatus] = useState<ShiftStatus>(shift.status);

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
    const from = [...new Set(hallShifts.map((s) => s.coveringFor))];
    const extra = DEFAULT_COVER_NAMES.filter((n) => !from.includes(n));
    return [...from, ...extra].slice(0, 12);
  }, [hallShifts]);
  const locationPills = useMemo(() => {
    const from = [...new Set(hallShifts.map((s) => s.locationName))];
    const extra = DEFAULT_LOCATIONS.filter((l) => !from.includes(l));
    return [...from, ...extra].slice(0, 10);
  }, [hallShifts]);

  const canSave = !!coveringFor && !!date && !!location && !!amount;

  const handleSave = () => {
    if (!canSave) return;
    onSave(shift.id, {
      coveringFor,
      shiftDate: date,
      locationName: location,
      notes: notes.trim(),
      shiftDay: getDayFromDate(date),
      amountEarned: parseFloat(amount).toFixed(2),
      status,
    });
  };

  return (
    <div className="space-y-5 py-2">
      {/* Covering For */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Covering For</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {personPills.map((name) => (
            <button key={name} type="button" onClick={() => setCoveringFor(coveringFor === name ? "" : name)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                coveringFor === name ? "bg-emerald-500 text-white border-emerald-500" : "bg-background border-border text-foreground hover:border-emerald-400"
              }`}
            >
              {name.split(" ")[0]}
              {coveringFor === name && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
        <ComboInput value={coveringFor} onChange={setCoveringFor} suggestions={personSuggestions} placeholder="Or type a name…" icon={<User className="w-3.5 h-3.5" />} />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {locationPills.map((loc) => (
            <button key={loc} type="button" onClick={() => setLocation(location === loc ? "" : loc)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                location === loc ? "bg-emerald-500 text-white border-emerald-500" : "bg-background border-border text-foreground hover:border-emerald-400"
              }`}
            >
              {loc}
              {location === loc && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
        <ComboInput value={location} onChange={setLocation} suggestions={locationSuggestions} placeholder="Or type a location…" icon={<MapPin className="w-3.5 h-3.5" />} />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Date</p>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      {/* Amount + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Amount ($)</p>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Status</p>
          <StatusToggle value={status} onChange={setStatus} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes <span className="font-normal text-muted-foreground">(optional)</span></p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering..." className="min-h-20 resize-none" />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-muted text-sm font-semibold text-muted-foreground active:brightness-95">Cancel</button>
        <button onClick={handleSave} disabled={isSubmitting || !canSave}
          className="flex-[2] py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Station edit form ────────────────────────────────────────────────────────

const RATE_KEYS: StationRateKey[] = ["Afternoon", "Saturday", "Sunday"];

function StationEditForm({
  shift,
  shifts,
  isSubmitting,
  onSave,
  onCancel,
}: {
  shift: Shift;
  shifts: Shift[];
  isSubmitting: boolean;
  onSave: (id: string, data: Partial<ShiftCreateInput>) => void;
  onCancel: () => void;
}) {
  // Parse existing data
  const existingTax = parseStationTax(shift.notes);
  const existingUserNote = parseStationUserNote(shift.notes);

  const [stationName, setStationName] = useState(shift.coveringFor ?? "");
  const [date, setDate] = useState(shift.shiftDate);
  const [rateKey, setRateKey] = useState<StationRateKey>("Afternoon");
  const [hours, setHours] = useState(String(shift.hoursWorked ?? 0));
  const [gross, setGross] = useState(shift.amountEarned);
  const [tax, setTax] = useState(existingTax.toFixed(2));
  const [notes, setNotes] = useState(existingUserNote);
  const [status, setStatus] = useState<ShiftStatus>(shift.status);

  const grossTouched = useRef(true); // pre-filled so don't auto-overwrite
  const taxTouched = useRef(true);

  // Past station names for autocomplete
  const pastStationNames = useMemo(() => {
    const seen = new Set<string>();
    for (const s of shifts) {
      if (isStationShift(s) && s.coveringFor) seen.add(s.coveringFor);
    }
    return Array.from(seen).sort();
  }, [shifts]);

  const grossNum = Number(gross) || 0;
  const taxNum = Number(tax) || 0;
  const net = Math.max(0, grossNum - taxNum);

  const canSave = stationName.trim().length > 0 && !!date && grossNum > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(shift.id, {
      coveringFor: stationName.trim(),
      shiftDate: date,
      locationName: STATION_LOCATION,
      notes: buildStationNotes(taxNum, notes),
      shiftDay: getDayFromDate(date),
      amountEarned: grossNum.toFixed(2),
      hoursWorked: Number(hours) || 0,
      status,
    });
  };

  return (
    <div className="space-y-5 py-2">
      {/* Station name — pills + input */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Station Name</p>
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
        <input
          list="edit-station-name-list"
          value={stationName}
          onChange={(e) => setStationName(e.target.value)}
          placeholder={pastStationNames.length > 0 ? "Or type a new station…" : "e.g. Central, Redfern..."}
        className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <datalist id="edit-station-name-list">
          {pastStationNames.map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>

      {/* Rate pills */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Shift Type <span className="font-normal text-muted-foreground text-xs">(for reference — won't auto-recalc)</span></p>
        <div className="flex gap-2">
          {RATE_KEYS.map((k) => (
            <button key={k} type="button" onClick={() => setRateKey(k)}
              className={`flex-1 flex flex-col items-center py-2 rounded-lg border text-xs font-medium transition-all ${
                rateKey === k ? "bg-blue-500 text-white border-blue-500" : "bg-background border-border text-foreground hover:border-blue-400"
              }`}
            >
              <span>{k}</span>
              <span className={`text-[10px] ${rateKey === k ? "text-blue-100" : "text-muted-foreground"}`}>${STATION_RATES[k].toFixed(2)}/hr</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date + Hours */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Date</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Hours Worked</p>
          <input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      {/* Gross + Tax */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Gross Amount ($)</p>
          <input type="number" step="0.01" min="0" value={gross} onChange={(e) => { grossTouched.current = true; setGross(e.target.value); }} className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tax Withheld ($)</p>
          <input type="number" step="0.01" min="0" value={tax} onChange={(e) => { taxTouched.current = true; setTax(e.target.value); }} className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <p className="text-xs text-muted-foreground">Est. {(STATION_TAX_RATE * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Net take-home */}
      <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Net take-home</p>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-500">Gross − tax</p>
        </div>
        <p className="text-xl font-semibold text-blue-700 dark:text-blue-400">${net.toFixed(2)}</p>
      </div>

      {/* Notes + Status */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes <span className="font-normal text-muted-foreground">(optional)</span></p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember..." className="min-h-20 resize-none" />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Status</p>
        <StatusToggle value={status} onChange={setStatus} />
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-muted text-sm font-semibold text-muted-foreground active:brightness-95">Cancel</button>
        <button onClick={handleSave} disabled={isSubmitting || !canSave}
          className="flex-[2] py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Top-level dialog ─────────────────────────────────────────────────────────

interface EditShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: Shift | null;
  shifts: Shift[];
  onSave: (id: string, data: Partial<ShiftCreateInput>) => void;
  isSubmitting: boolean;
}

export function EditShiftDialog({ open, onOpenChange, shift, shifts, onSave, isSubmitting }: EditShiftDialogProps) {
  const station = shift ? isStationShift(shift) : false;

  const handleSave = (id: string, data: Partial<ShiftCreateInput>) => {
    onSave(id, data);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 transition-all"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: open ? "blur(4px)" : "none", WebkitBackdropFilter: open ? "blur(4px)" : "none", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.22s ease" }}
        onClick={() => onOpenChange(false)} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl"
        style={{ transform: open ? "translateY(0)" : "translateY(100%)", transition: "transform 0.32s cubic-bezier(0.32,0.72,0,1)", maxHeight: "94dvh", overflowY: "auto", overscrollBehavior: "contain", paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="px-4 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black flex items-center gap-2">
              {station && <MapPin className="w-5 h-5 text-blue-500" />}
              Edit {station ? "Station" : "Hall"} Shift
            </h2>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {shift && (
            station ? (
              <StationEditForm shift={shift} shifts={shifts} isSubmitting={isSubmitting} onSave={handleSave} onCancel={() => onOpenChange(false)} />
            ) : (
              <HallEditForm shift={shift} shifts={shifts} isSubmitting={isSubmitting} onSave={handleSave} onCancel={() => onOpenChange(false)} />
            )
          )}
        </div>
      </div>
    </>
  );
}
