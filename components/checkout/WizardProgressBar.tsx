"use client";

interface WizardProgressBarProps {
  step: 1 | 2 | 3;
}

const STEPS = [
  { num: 1, label: "การจัดส่ง" },
  { num: 2, label: "การชำระเงิน" },
  { num: 3, label: "ยืนยันคำสั่งซื้อ" },
] as const;

export default function WizardProgressBar({ step }: WizardProgressBarProps) {
  return (
    <div className="wizard-progress">
      {STEPS.map((s, i) => (
        <div key={s.num} className="wizard-progress-item">
          {/* Connector line (between steps) */}
          {i > 0 && (
            <div className={`wizard-connector ${step > s.num - 1 ? "active" : ""}`} />
          )}
          {/* Step dot */}
          <div
            className={`wizard-step-dot ${
              step === s.num ? "current" : step > s.num ? "done" : ""
            }`}
          >
            {step > s.num ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-xs font-bold">{s.num}</span>
            )}
          </div>
          {/* Label */}
          <span
            className={`text-[11px] font-semibold mt-1.5 ${
              step >= s.num ? "text-[#111]" : "text-[#bbb]"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
