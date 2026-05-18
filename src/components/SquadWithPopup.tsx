"use client";

import { useState } from "react";
import Image from "next/image";
import PlayerPopup from "@/components/PlayerPopup";

type Player = {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: Date | null;
  photo: string | null;
};

const POSITION_MAP: Record<string, { abbr: string; label: string }> = {
  Goalkeeper:           { abbr: "GR",  label: "Goleiro" },
  Defence:              { abbr: "DEF", label: "Defensor" },
  "Centre-Back":        { abbr: "ZAG", label: "Zagueiro" },
  "Left-Back":          { abbr: "LE",  label: "Lateral Esquerdo" },
  "Right-Back":         { abbr: "LD",  label: "Lateral Direito" },
  Midfield:             { abbr: "MEI", label: "Meia" },
  "Defensive Midfield": { abbr: "VOL", label: "Volante" },
  "Central Midfield":   { abbr: "MEI", label: "Meia Central" },
  "Attacking Midfield": { abbr: "MAI", label: "Meia Atacante" },
  Offence:              { abbr: "ATA", label: "Atacante" },
  "Left Winger":        { abbr: "PE",  label: "Ponta Esquerda" },
  "Right Winger":       { abbr: "PD",  label: "Ponta Direita" },
  "Centre-Forward":     { abbr: "CA",  label: "Centroavante" },
  "Secondary Striker":  { abbr: "SA",  label: "Segundo Atacante" },
};

function getPos(position: string | null) {
  if (!position) return { abbr: "—", label: "—" };
  return POSITION_MAP[position] ?? { abbr: position.slice(0, 3).toUpperCase(), label: position };
}

function calcAge(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - new Date(dob).getFullYear();
  const m = today.getMonth() - new Date(dob).getMonth();
  if (m < 0 || (m === 0 && today.getDate() < new Date(dob).getDate())) age--;
  return age;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

type Props = {
  groups: Array<{ group: string; players: Player[] }>;
};

export default function SquadWithPopup({ groups }: Props) {
  const [popupId, setPopupId]     = useState<number | null>(null);
  const [popupName, setPopupName] = useState("");
  const [popupPhoto, setPopupPhoto] = useState<string | null>(null);

  function openPopup(p: Player) {
    setPopupId(p.id);
    setPopupName(p.name);
    setPopupPhoto(p.photo);
  }

  return (
    <>
      {popupId !== null && (
        <PlayerPopup
          playerId={popupId}
          playerName={popupName}
          playerPhoto={popupPhoto}
          onClose={() => setPopupId(null)}
        />
      )}

      <div className="flex flex-col gap-8">
        {groups.map(({ group, players }) => (
          <div key={group}>
            <p className="mb-3 text-[9px] font-bold tracking-[0.28em] uppercase text-[#C8A96B]/60">
              {group}
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
              {players.map((player) => {
                const { abbr, label } = getPos(player.position);
                const age = calcAge(player.dateOfBirth);
                return (
                  <button
                    key={player.id}
                    onClick={() => openPopup(player)}
                    className="group flex items-center gap-3 bg-white/[0.03] border border-white/[0.07] rounded-[14px] px-3 py-3 hover:border-[#C8A96B]/25 transition-colors text-left w-full"
                  >
                    {/* Photo */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-white/[0.06] overflow-hidden flex items-center justify-center">
                      {player.photo ? (
                        <Image
                          src={player.photo}
                          alt={player.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      ) : (
                        <span className="text-[9px] font-extrabold tracking-[0.02em] text-[#C8A96B]">
                          {getInitials(player.name)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-[#F3F4F6] truncate leading-tight">
                        {player.name}
                      </div>
                      <div className="text-[10px] text-[#6B7280] truncate">
                        <span title={abbr}>{label}</span>
                        {age !== null && (
                          <span className="before:content-['·'] before:mx-1 before:opacity-40">
                            {age} anos
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="ml-auto text-[#C8A96B]/20 group-hover:text-[#C8A96B]/50 transition-colors text-[10px] flex-shrink-0">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
