"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

type Team = {
  id: number;
  tla: string | null;
  name: string;
  logo: string | null;
};

const ROTATION_INTERVAL = 8000;
const FADE_DURATION = 300;
const SLOTS = 6;
const SWAP_COUNT = 2;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TeamMosaic({ teams }: { teams: Team[] }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const slots = isMobile ? 4 : SLOTS;

  const poolRef = useRef<Team[]>(shuffle(teams));
  const usedRef = useRef<Set<number>>(new Set());

  const initialSlots = poolRef.current.slice(0, SLOTS);
  initialSlots.forEach((t) => usedRef.current.add(t.id));

  const [visible, setVisible] = useState<Team[]>(initialSlots);
  const [fading, setFading] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (teams.length <= slots) return;

    const timer = setInterval(() => {
      // Pick SWAP_COUNT indices to swap
      const indices = shuffle([...Array(slots).keys()]).slice(0, SWAP_COUNT);

      // Find next unseen teams
      const remaining = poolRef.current.filter((t) => !usedRef.current.has(t.id));
      if (remaining.length < SWAP_COUNT) {
        // Reset pool when exhausted
        poolRef.current = shuffle(teams);
        usedRef.current = new Set(visible.map((t) => t.id));
        return;
      }
      const nextTeams = remaining.slice(0, SWAP_COUNT);

      // Start fade out
      setFading(new Set(indices));

      setTimeout(() => {
        setVisible((prev) => {
          const next = [...prev];
          indices.forEach((idx, i) => {
            usedRef.current.delete(next[idx].id);
            usedRef.current.add(nextTeams[i].id);
            next[idx] = nextTeams[i];
          });
          return next;
        });
        setFading(new Set());
      }, FADE_DURATION);
    }, ROTATION_INTERVAL);

    return () => clearInterval(timer);
  }, [teams, visible]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-w-[860px]">
      {visible.slice(0, slots).map((t, i) => (
        <Link
          key={`${t.id}-${i}`}
          href={`/teams/${(t.tla ?? "").toLowerCase()}`}
          className="group relative overflow-hidden rounded-[16px] hover:scale-[1.025] transition-transform no-underline"
          style={{
            aspectRatio: "4/3",
            opacity: fading.has(i) ? 0 : 1,
            transition: `opacity ${FADE_DURATION}ms ease`,
          }}
        >
          {/* BG gradient using logo dominant hue fallback */}
          <div className="absolute inset-0 bg-[#1a1f2e]" />

          {/* Logo centered */}
          {t.logo ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <Image
                src={t.logo}
                alt={t.name}
                width={110}
                height={110}
                className="object-contain drop-shadow-lg opacity-90"
                unoptimized
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-extrabold text-white/10 tracking-[-0.05em]">
                {t.tla}
              </span>
            </div>
          )}

          {/* Bottom gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Gold hover accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C8A96B] opacity-0 group-hover:opacity-60 transition-opacity" />

          {/* Country name */}
          <span className="absolute bottom-3.5 left-3.5 text-[9px] font-semibold tracking-[0.14em] uppercase text-white/50">
            {t.name}
          </span>

          {/* TLA */}
          <span
            className="absolute font-extrabold text-white/15 tracking-[-0.05em] leading-none select-none"
            style={{
              bottom: -4,
              right: 10,
              fontSize: "clamp(46px, 8vw, 74px)",
            }}
          >
            {t.tla}
          </span>
        </Link>
      ))}
    </div>
  );
}
