"use client";

import { useState } from "react";
import Image from "next/image";
import CoachPopup from "@/components/CoachPopup";

type Coach = {
  id: number;
  name: string;
  nationality: string | null;
  photo: string | null;
  contractStart: string | null;
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function CoachCard({ coach }: { coach: Coach }) {
  const [open, setOpen]     = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <>
      {open && (
        <CoachPopup
          coachId={coach.id}
          coachName={coach.name}
          coachPhoto={coach.photo}
          onClose={() => setOpen(false)}
        />
      )}

      <button
        onClick={() => setOpen(true)}
        className="group flex items-center gap-4 w-full md:max-w-[480px] bg-white/[0.03] border border-white/[0.07] rounded-[18px] px-5 py-4 hover:border-[#C8A96B]/30 transition-colors text-left"
      >
        {/* Photo */}
        <div className="flex-shrink-0 w-14 h-14 rounded-[12px] bg-white/[0.06] overflow-hidden flex items-center justify-center">
          {coach.photo && !imgError ? (
            <Image
              src={coach.photo}
              alt={coach.name}
              width={56}
              height={56}
              className="object-cover w-full h-full"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-[11px] font-extrabold tracking-[0.02em] text-[#C8A96B]">
              {getInitials(coach.name)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-[#F3F4F6] truncate leading-tight">{coach.name}</div>
          <div className="text-[11px] text-[#6B7280] truncate mt-0.5">
            {coach.nationality ?? "—"}
            {coach.contractStart && (
              <span className="before:content-['·'] before:mx-1.5 before:opacity-40">
                desde {coach.contractStart}
              </span>
            )}
          </div>
        </div>

        <span className="ml-auto text-[#C8A96B]/20 group-hover:text-[#C8A96B]/60 transition-colors text-[11px] flex-shrink-0">→</span>
      </button>
    </>
  );
}
