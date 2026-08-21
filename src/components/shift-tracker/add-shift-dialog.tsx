"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Plus, Loader2, User, MapPin, StickyNote, Check, UserX, X, ChevronDown } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { getDayFromDate, buildSuggestions, formatCurrency } from "@/lib/utils";
import { STATION_LOCATION, buildStationNotes, isStationShift } from "@/types/database.types";
import { DEFAULT_LOCATIONS, DEFAULT_COVER_NAMES, STATION_RATES, STATION_TAX_RATE, type StationRateKey } from "@/lib/constants";
import type { ShiftStatus, ShiftCreateInput, Shift } from "@/types/database.types";
import { ComboInput } from "./combo-input";

type JobKind = "Hall" | "Station";

// ── Shared field components ──────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{children}</p>;
}

function PillGroup({ options, value, onChange, color = "emerald" }: {
  options: string[]; value: string; onChange: (v: string) => void; color?: "emerald" | "blue";
}) {
  const activeClass = color === "emerald" ? "bg-emerald-500 text-white border-emerald-500" : "bg-blue-500 text-white border-blue-500";
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(value === opt ? "" : opt)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${value === opt ? activeClass : "bg-muted/60 border-transparent text-foreground"}`}>
          {opt.split(" ")[0]}
          {value === opt && <Check className="w-3 h-3" />}
        </button>
      ))}
    </div>
  );
}

function FieldBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-muted/40 rounded-2xl p-4 space-y-3 ${className}`}>{children}</div>;
}

function StatusToggle({ value, onChange }: { value: ShiftStatus; onChange: (v: ShiftStatus) => void }) {
  return (
    <div className="flex gap-2">
      {(["Unpaid", "Paid"] as ShiftStatus[]).map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
            value === s
              ? s === "Paid" ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500"
              : "bg-background border-border/50 text-muted-foreground"
          }`}>
          {s === "Paid" ? "✓ Paid" : "Unpaid"}
        </button>
      ))}
    </div>
  );
}

// ── Hall Form ────────────────────────────────────────────────────────────────

function HallForm({ shifts, defaultPerson, defaultLocation, defaultDate, isSubmitting, onSubmit, onCancel, userName }: {
  shifts: Shift[]; defaultPerson?: string; defaultLocation?: string; defaultDate?: string;
  isSubmitting: boolean; onSubmit: (d: ShiftCreateInput) => void; onCancel: () => void; userName?: string;
}) {
  const today = new Date().toISOString().split("T")[0];
  const { payRates } = useSettingsStore();
  const [coveringFor, setCoveringFor] = useState(defaultPerson ?? "");
  const [formDate,    setFormDate]    = useState(defaultDate ?? today);
  const [location,    setLocation]    = useState(defaultLocation ?? "");
  const [amount,      setAmount]      = useState(String(payRates.defaultHallAmount || 110));
  const [notes,       setNotes]       = useState("");
  const [status,      setStatus]      = useState<ShiftStatus>("Unpaid");
  const [isCovered,   setIsCovered]   = useState(false);
  const [coveredBy,   setCoveredBy]   = useState("");

  // Update date if defaultDate changes (from calendar)
  useEffect(() => { if (defaultDate) setFormDate(defaultDate); }, [defaultDate]);

  const hallShifts = useMemo(() => shifts.filter(s => !isStationShift(s)), [shifts]);
  const personPills = useMemo(() => {
    const from = [...new Set(hallShifts.map(s => s.coveringFor))];
    return [...from, ...DEFAULT_COVER_NAMES.filter(n => !from.includes(n))].slice(0, 10);
  }, [hallShifts]);
  const locationPills = useMemo(() => {
    const from = [...new Set(hallShifts.map(s => s.locationName))];
    return [...from, ...DEFAULT_LOCATIONS.filter(l => !from.includes(l))].slice(0, 8);
  }, [hallShifts]);
  const personSuggestions    = useMemo(() => buildSuggestions(hallShifts.map(s => s.coveringFor), DEFAULT_COVER_NAMES), [hallShifts]);
  const coveredBySuggestions = useMemo(() => {
    const past = [...new Set(hallShifts.filter(s => s.coveredBy).map(s => s.coveredBy!))].sort();
    return past.length > 0 ? past : ["Suman"];
  }, [hallShifts]);
  const locationSuggestions = useMemo(() => buildSuggestions(hallShifts.map(s => s.locationName), DEFAULT_LOCATIONS), [hallShifts]);

  const canSubmit = (isCovered || !!coveringFor) && !!formDate && !!location && !!amount;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      coveringFor: isCovered ? (userName ?? "Myself") : coveringFor,
      shiftDate: formDate, locationName: location,
      notes: notes.trim(), shiftDay: getDayFromDate(formDate),
      coveredBy: isCovered && coveredBy.trim() ? coveredBy.trim() : null,
      amountEarned: parseFloat(amount).toFixed(2),
      hoursWorked: 0, status,
    });
  };

  return (
    <div className="space-y-4">

      {/* Covered by toggle */}
      <button type="button" onClick={() => { setIsCovered(v => !v); if (isCovered) setCoveredBy(""); }}
        className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all active:scale-95 ${
          isCovered ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700" : "bg-muted/40 border-transparent text-muted-foreground"
        }`}>
        <UserX className="w-4 h-4 shrink-0" />
        {isCovered ? "✓ Someone covered this shift" : "Was this covered by someone?"}
      </button>

      {isCovered && (
        <FieldBox>
          <FieldLabel>Covered by</FieldLabel>
          {/* Pill chips for saved names */}
          {coveredBySuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {coveredBySuggestions.map(name => (
                <button key={name} type="button"
                  onClick={() => setCoveredBy(coveredBy === name ? "" : name)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                    coveredBy === name
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-muted/60 border-transparent text-foreground"
                  }`}>
                  {name}
                  {coveredBy === name && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          )}
          <input value={coveredBy} onChange={e => setCoveredBy(e.target.value)}
            placeholder="Or type a name…"
            className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
          <p className="text-[11px] text-muted-foreground">Tracked in Owe tab — separate from your earnings.</p>
        </FieldBox>
      )}

      {/* Covering for */}
      {!isCovered && (
        <FieldBox>
          <FieldLabel>Covering for</FieldLabel>
          <PillGroup options={personPills} value={coveringFor} onChange={setCoveringFor} />
          <ComboInput value={coveringFor} onChange={setCoveringFor} suggestions={personSuggestions}
            placeholder="Or type a name…" icon={<User className="w-3.5 h-3.5" />} />
        </FieldBox>
      )}

      {/* Location */}
      <FieldBox>
        <FieldLabel>Location</FieldLabel>
        <PillGroup options={locationPills} value={location} onChange={setLocation} />
        <ComboInput value={location} onChange={setLocation} suggestions={locationSuggestions}
          placeholder="Or type location…" icon={<MapPin className="w-3.5 h-3.5" />} />
      </FieldBox>

      {/* Date + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <FieldBox>
          <FieldLabel>Date</FieldLabel>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </FieldBox>
        <FieldBox>
          <FieldLabel>Amount ($)</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold tabular-nums" />
        </FieldBox>
      </div>

      {/* Status */}
      <FieldBox>
        <FieldLabel>Status</FieldLabel>
        <StatusToggle value={status} onChange={setStatus} />
      </FieldBox>

      {/* Notes */}
      <FieldBox>
        <FieldLabel>Notes <span className="normal-case font-normal text-muted-foreground">(optional)</span></FieldLabel>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="Anything to remember…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed" />
      </FieldBox>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-muted text-sm font-semibold text-muted-foreground active:brightness-95">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}
          className="flex-[2] py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isSubmitting ? "Adding…" : "Add Shift"}
        </button>
      </div>
    </div>
  );
}

// ── Station Form ─────────────────────────────────────────────────────────────

const RATE_KEYS: StationRateKey[] = ["Afternoon", "Saturday", "Sunday"];

function StationForm({ shifts, defaultDate, isSubmitting, onSubmit, onCancel }: {
  shifts: Shift[]; defaultDate?: string; isSubmitting: boolean;
  onSubmit: (d: ShiftCreateInput) => void; onCancel: () => void;
}) {
  const { payRates } = useSettingsStore();
  const dynamicRates = { Afternoon: payRates.afternoonRate, Saturday: payRates.saturdayRate, Sunday: payRates.sundayRate };
  const today = new Date().toISOString().split("T")[0];
  const [stationName, setStationName] = useState("");
  const [rateKey,     setRateKey]     = useState<StationRateKey>("Afternoon");
  const [formDate,    setFormDate]    = useState(defaultDate ?? today);
  const [hours,       setHours]       = useState("5");
  const [notes,       setNotes]       = useState("");
  const [status,      setStatus]      = useState<ShiftStatus>("Unpaid");
  const [grossOverride, setGrossOverride] = useState<string | null>(null);
  const [taxOverride,   setTaxOverride]   = useState<string | null>(null);

  useEffect(() => { if (defaultDate) setFormDate(defaultDate); }, [defaultDate]);

  const autoGross   = (Number(hours) || 0) * dynamicRates[rateKey];
  const displayGross = grossOverride ?? autoGross.toFixed(2);
  const autoTax     = (Number(displayGross) || 0) * (payRates.taxRate || STATION_TAX_RATE);
  const displayTax  = taxOverride ?? autoTax.toFixed(2);
  const grossNum    = Number(displayGross) || 0;
  const taxNum      = Number(displayTax)   || 0;
  const net         = Math.max(0, grossNum - taxNum);

  const pastStationNames = useMemo(() => {
    const seen = new Set<string>();
    for (const s of shifts) if (isStationShift(s) && s.coveringFor) seen.add(s.coveringFor);
    return Array.from(seen).sort();
  }, [shifts]);

  const canSubmit = stationName.trim().length > 0 && !!formDate && Number(hours) > 0 && grossNum > 0;

  const changeRateKey = (k: StationRateKey) => { setRateKey(k); setGrossOverride(null); setTaxOverride(null); };
  const changeHours   = (h: string)         => { setHours(h);   setGrossOverride(null); setTaxOverride(null); };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      coveringFor: stationName.trim(), shiftDate: formDate,
      locationName: STATION_LOCATION, notes: buildStationNotes(taxNum, notes),
      shiftDay: getDayFromDate(formDate), amountEarned: grossNum.toFixed(2),
      hoursWorked: Number(hours) || 0, status,
    });
  };

  return (
    <div className="space-y-4">

      {/* Station name */}
      <FieldBox>
        <FieldLabel>Station Name</FieldLabel>
        {pastStationNames.length > 0 && (
          <PillGroup options={pastStationNames} value={stationName} onChange={setStationName} color="blue" />
        )}
        <input list="station-name-list" value={stationName} onChange={e => setStationName(e.target.value)}
          placeholder={pastStationNames.length > 0 ? "Or type new station…" : "e.g. Central, Redfern…"}
          className="w-full h-10 px-3.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
        <datalist id="station-name-list">{pastStationNames.map(n => <option key={n} value={n} />)}</datalist>
      </FieldBox>

      {/* Rate type */}
      <FieldBox>
        <FieldLabel>Shift Type</FieldLabel>
        <div className="flex gap-2">
          {RATE_KEYS.map(k => (
            <button key={k} type="button" onClick={() => changeRateKey(k)}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 transition-all active:scale-95 ${
                rateKey === k ? "bg-blue-500 text-white border-blue-500" : "bg-muted/40 border-transparent text-foreground"
              }`}>
              <span className="text-xs font-bold">{k}</span>
              <span className={`text-[10px] mt-0.5 ${rateKey === k ? "text-blue-100" : "text-muted-foreground"}`}>
                ${dynamicRates[k].toFixed(2)}/hr
              </span>
            </button>
          ))}
        </div>
      </FieldBox>

      {/* Date + Hours */}
      <div className="grid grid-cols-2 gap-3">
        <FieldBox>
          <FieldLabel>Date</FieldLabel>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </FieldBox>
        <FieldBox>
          <FieldLabel>Hours</FieldLabel>
          <input type="number" step="0.25" min="0" value={hours} onChange={e => changeHours(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold tabular-nums" />
        </FieldBox>
      </div>

      {/* Net take-home hero */}
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, oklch(0.52 0.15 255), oklch(0.40 0.13 255))" }}>
        <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-1">Net Take-home</p>
        <p className="text-3xl font-black text-white tabular-nums">{formatCurrency(net)}</p>
        <p className="text-white/60 text-xs mt-1.5">{formatCurrency(grossNum)} gross · {formatCurrency(taxNum)} tax</p>
      </div>

      {/* Gross + Tax editable */}
      <div className="grid grid-cols-2 gap-3">
        <FieldBox>
          <FieldLabel>Gross ($)</FieldLabel>
          <input type="number" step="0.01" min="0" value={displayGross}
            onChange={e => { setGrossOverride(e.target.value); setTaxOverride(null); }}
            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold tabular-nums" />
          <p className="text-[10px] text-muted-foreground">Auto-calc · editable</p>
        </FieldBox>
        <FieldBox>
          <FieldLabel>Tax ($)</FieldLabel>
          <input type="number" step="0.01" min="0" value={displayTax}
            onChange={e => setTaxOverride(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold tabular-nums" />
          <p className="text-[10px] text-muted-foreground">{((payRates.taxRate || STATION_TAX_RATE)*100).toFixed(1)}% · editable</p>
        </FieldBox>
      </div>

      {/* Status */}
      <FieldBox>
        <FieldLabel>Status</FieldLabel>
        <StatusToggle value={status} onChange={setStatus} />
      </FieldBox>

      {/* Notes */}
      <FieldBox>
        <FieldLabel>Notes <span className="normal-case font-normal text-muted-foreground">(optional)</span></FieldLabel>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Anything to remember…"
          className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
      </FieldBox>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-muted text-sm font-semibold text-muted-foreground active:brightness-95">Cancel</button>
        <button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}
          className="flex-[2] py-3.5 rounded-2xl bg-blue-500 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {isSubmitting ? "Adding…" : "Add Station Shift"}
        </button>
      </div>
    </div>
  );
}

// ── Dialog shell — native bottom sheet ───────────────────────────────────────

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShiftCreateInput) => void;
  isSubmitting: boolean;
  shifts: Shift[];
  defaultPerson?: string;
  defaultLocation?: string;
  defaultDate?: string;
  userName?: string;
}

export function AddShiftDialog({ open, onOpenChange, onSubmit, isSubmitting, shifts, defaultPerson, defaultLocation, defaultDate, userName }: AddShiftDialogProps) {
  const [jobKind, setJobKind] = useState<JobKind>("Hall");

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
            <h2 className="text-xl font-black">Add Shift</h2>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Hall / Station toggle */}
          <div className="flex gap-1 p-1 bg-muted/80 rounded-2xl mb-5">
            {(["Hall", "Station"] as JobKind[]).map(k => (
              <button key={k} type="button" onClick={() => setJobKind(k)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  jobKind === k
                    ? k === "Hall" ? "bg-white dark:bg-card text-emerald-700 shadow-sm" : "bg-white dark:bg-card text-blue-700 shadow-sm"
                    : "text-muted-foreground"
                }`}>
                {k === "Hall" ? <span className="w-2 h-2 rounded-full bg-emerald-500" /> : <MapPin className="w-3.5 h-3.5" />}
                {k}
              </button>
            ))}
          </div>

          {jobKind === "Hall"
            ? <HallForm shifts={shifts} defaultPerson={defaultPerson} defaultLocation={defaultLocation} defaultDate={defaultDate} isSubmitting={isSubmitting} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
            : <StationForm shifts={shifts} defaultDate={defaultDate} isSubmitting={isSubmitting} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
          }
        </div>
      </div>
    </>
  );
}
