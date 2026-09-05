"use client";

import { useTr } from "@/lib/i18n/LocaleProvider";

import { useState } from "react";
import { CAMPUS_MEETUP_LOCATIONS } from "@/lib/config/meetup-locations";
import type { RentalCheckoutState } from "./useRentalCheckoutReducer";

interface Props {
  state: RentalCheckoutState;
  startDate: string;
  onUpdate: (fields: {
    pickupLocation: string;
    pickupDateTime: string;
    pickupNote: string;
    sameReturnLocation: boolean;
    returnLocation: string;
  }) => void;
}

export default function PickupStep({ state, startDate, onUpdate }: Props) {
  const tr = useTr();
  const [useCustomPickup,  setUseCustomPickup]  = useState(
    !CAMPUS_MEETUP_LOCATIONS.some((l) => l.label === state.pickupLocation)
  );
  const [useCustomReturn, setUseCustomReturn] = useState(false);

  // Extract time portion from existing pickupDateTime if already set, else default to 10:00
  const existingTime = state.pickupDateTime?.slice(11, 16) || "10:00";
  const [pickupTime, setPickupTime] = useState(existingTime);

  // Formatted date label for the static tr("วันที่นัดรับ") row
  const formattedStartDate = startDate
    ? new Date(startDate).toLocaleDateString("th-TH", {
        year: "numeric", month: "long", day: "numeric", weekday: "long",
      })
    : "—";

  function patch(partial: Partial<typeof state>) {
    onUpdate({
      pickupLocation:     state.pickupLocation,
      pickupDateTime:     state.pickupDateTime,
      pickupNote:         state.pickupNote,
      sameReturnLocation: state.sameReturnLocation,
      returnLocation:     state.returnLocation,
      ...partial,
    });
  }

  // Build the full pickupDateTime from locked date + chosen time
  function handleTimeChange(time: string) {
    setPickupTime(time);
    if (startDate && time) {
      patch({ pickupDateTime: `${startDate}T${time}` });
    }
  }

  return (
    <div className="space-y-5">
      {/* Pickup location */}
      <div>
        <label className="block text-xs font-semibold text-[var(--c-ink-2)] mb-2">{tr("📍 สถานที่นัดรับ")}<span className="text-[var(--c-danger)]">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {CAMPUS_MEETUP_LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                setUseCustomPickup(false);
                patch({
                  pickupLocation: loc.label,
                  returnLocation: state.sameReturnLocation ? loc.label : state.returnLocation,
                });
              }}
              className={`p-2.5 rounded-xl border text-left transition text-xs ${
                !useCustomPickup && state.pickupLocation === loc.label
                  ? "bg-[var(--c-accent)]/10 border-[var(--c-accent)] text-[var(--c-accent)]"
                  : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-faint)]"
              }`}
            >
              <p className="font-semibold">{tr(loc.label)}</p>
              <p className="text-[10px] opacity-70 mt-0.5">{loc.description}</p>
            </button>
          ))}
          {/* Custom option */}
          <button
            type="button"
            onClick={() => setUseCustomPickup(true)}
            className={`p-2.5 rounded-xl border text-left transition text-xs ${
              useCustomPickup
                ? "bg-[var(--c-accent)]/10 border-[var(--c-accent)] text-[var(--c-accent)]"
                : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-faint)]"
            }`}
          >
            <p className="font-semibold">{tr("✏️ กำหนดเอง")}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{tr("ระบุสถานที่อื่น")}</p>
          </button>
        </div>
        {useCustomPickup && (
          <input
            type="text"
            placeholder={tr("ระบุสถานที่นัดรับ...")}
            value={state.pickupLocation}
            onChange={(e) => patch({
              pickupLocation: e.target.value,
              returnLocation: state.sameReturnLocation ? e.target.value : state.returnLocation,
            })}
            className="w-full px-3 py-2.5 border border-[var(--c-line)] rounded-xl text-sm mt-1
                       focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)]"
          />
        )}
      </div>

      {/* Pickup time — date is locked to rentalStartDate from Step 1 */}
      <div>
        <label className="block text-xs font-semibold text-[var(--c-ink-2)] mb-1.5">{tr("🕐 เวลานัดรับ")}<span className="text-[var(--c-danger)]">*</span>
        </label>

        {/* Static date display */}
        <div className="flex items-center gap-2 bg-[var(--c-subtle)] border border-[var(--c-line)] rounded-xl px-3 py-2.5 mb-2">
          <span className="text-sm">📅</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--c-faint)] font-medium uppercase tracking-wide">{tr("วันที่นัดรับ")}</p>
            <p className="text-sm font-semibold text-[var(--c-ink)] truncate">{formattedStartDate}</p>
          </div>
          <span className="text-[10px] text-[var(--c-accent)] bg-[var(--c-accent)]/10 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">{tr("ล็อกจาก Step 1")}</span>
        </div>

        {/* Time-only picker */}
        <input
          type="time"
          value={pickupTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-[var(--c-line)] rounded-xl text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30 focus:border-[var(--c-accent)]"
        />
        <p className="text-[11px] text-[var(--c-faint)] mt-1">{tr("เลือกเวลาที่สะดวกนัดรับของในวันดังกล่าว")}</p>
      </div>

      {/* Return location */}
      <div>
        <label className="block text-xs font-semibold text-[var(--c-ink-2)] mb-2">{tr("📦 สถานที่คืนของ")}</label>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={state.sameReturnLocation}
            onChange={(e) => {
              patch({
                sameReturnLocation: e.target.checked,
                returnLocation: e.target.checked ? state.pickupLocation : "",
              });
              if (e.target.checked) setUseCustomReturn(false);
            }}
            className="w-4 h-4 accent-[var(--c-accent)]"
          />
          <span className="text-sm text-[var(--c-ink-2)]">{tr("คืนที่เดียวกับที่รับ")}</span>
        </label>

        {!state.sameReturnLocation && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {CAMPUS_MEETUP_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setUseCustomReturn(false);
                    patch({ returnLocation: loc.label });
                  }}
                  className={`p-2.5 rounded-xl border text-left transition text-xs ${
                    !useCustomReturn && state.returnLocation === loc.label
                      ? "bg-[var(--c-accent-soft)] border-blue-400 text-[var(--c-accent-str)]"
                      : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-faint)]"
                  }`}
                >
                  <p className="font-semibold">{tr(loc.label)}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{loc.description}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustomReturn(true)}
                className={`p-2.5 rounded-xl border text-left transition text-xs ${
                  useCustomReturn
                    ? "bg-[var(--c-accent-soft)] border-blue-400 text-[var(--c-accent-str)]"
                    : "border-[var(--c-line)] text-[var(--c-ink-2)] hover:border-[var(--c-faint)]"
                }`}
              >
                <p className="font-semibold">{tr("✏️ กำหนดเอง")}</p>
              </button>
            </div>
            {useCustomReturn && (
              <input
                type="text"
                placeholder={tr("ระบุสถานที่คืนของ...")}
                value={state.returnLocation}
                onChange={(e) => patch({ returnLocation: e.target.value })}
                className="w-full px-3 py-2.5 border border-[var(--c-line)] rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            )}
          </>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-[var(--c-ink-2)] mb-1.5">{tr("หมายเหตุ (ไม่บังคับ)")}</label>
        <textarea
          value={state.pickupNote}
          onChange={(e) => patch({ pickupNote: e.target.value })}
          rows={2}
          placeholder='เช่น tr("ใส่เสื้อสีแดง") หรือ tr("จะโทรก่อนถึง 10 นาที")'
          className="w-full px-3 py-2.5 border border-[var(--c-line)] rounded-xl text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30"
        />
      </div>
    </div>
  );
}
