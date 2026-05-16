"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "copa360_splash_seen";

export default function Splash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  function dismiss() {
    if (leaving) return;
    setLeaving(true);
    sessionStorage.setItem(STORAGE_KEY, "1");

    // Gold flash
    const flash = document.getElementById("splash-flash");
    if (flash) {
      flash.style.opacity = "0.1";
      setTimeout(() => { flash.style.opacity = "0"; }, 140);
    }

    setTimeout(() => setVisible(false), 900);
  }

  useEffect(() => {
    if (!visible) return;
    const handler = () => dismiss();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, leaving]);

  if (!visible) return null;

  return (
    <>
      {/* Flash overlay */}
      <div
        id="splash-flash"
        style={{
          position: "fixed",
          inset: 0,
          background: "#C8A96B",
          zIndex: 200,
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.1s ease",
        }}
      />

      {/* Splash */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "#0B1020",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "opacity 0.8s cubic-bezier(0.4,0,0.2,1)",
          opacity: leaving ? 0 : 1,
        }}
      >
        {/* Animated grid */}
        <div
          style={{
            position: "absolute",
            inset: -80,
            backgroundImage:
              "linear-gradient(rgba(200,169,107,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(200,169,107,0.025) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            animation: "gridDrift 24s linear infinite",
          }}
        />

        {/* Vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, transparent, #0B1020 85%)",
            pointerEvents: "none",
          }}
        />

        {/* Corner brackets */}
        {(["tl", "tr", "bl", "br"] as const).map((pos) => (
          <div
            key={pos}
            style={{
              position: "absolute",
              width: 44,
              height: 44,
              borderColor: "rgba(200,169,107,0.2)",
              borderStyle: "solid",
              ...(pos === "tl" && { top: 32, left: 32, borderWidth: "1px 0 0 1px" }),
              ...(pos === "tr" && { top: 32, right: 32, borderWidth: "1px 1px 0 0" }),
              ...(pos === "bl" && { bottom: 32, left: 32, borderWidth: "0 0 1px 1px" }),
              ...(pos === "br" && { bottom: 32, right: 32, borderWidth: "0 1px 1px 0" }),
            }}
          />
        ))}

        {/* Center content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            animation: "splashArrive 1s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 400,
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: "rgba(200,169,107,0.5)",
              marginBottom: 32,
            }}
          >
            FIFA World Cup 2026
          </div>

          <div style={{ position: "relative", display: "inline-block" }}>
            {/* Orbital ring */}
            <svg
              viewBox="0 0 220 220"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 220,
                height: 220,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            >
              <circle
                cx="110"
                cy="110"
                r="108"
                fill="none"
                stroke="rgba(200,169,107,0.12)"
                strokeWidth="1"
                strokeDasharray="4 8"
              />
              <circle
                cx="110"
                cy="2"
                r="3"
                fill="#C8A96B"
                opacity="0.5"
                style={{ animation: "orbitSpin 8s linear infinite", transformOrigin: "110px 110px" }}
              />
            </svg>

            <span
              style={{
                display: "block",
                fontSize: "clamp(64px, 14vw, 140px)",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "#F3F4F6",
              }}
            >
              COPA
            </span>
            <span
              style={{
                display: "block",
                fontSize: "clamp(72px, 16vw, 160px)",
                fontWeight: 800,
                lineHeight: 0.9,
                letterSpacing: "-0.05em",
                color: "#C8A96B",
                textShadow: "0 0 80px rgba(200,169,107,0.25)",
              }}
            >
              360
            </span>
          </div>

          <div
            style={{
              fontSize: "clamp(11px, 1.1vw, 13px)",
              fontWeight: 300,
              letterSpacing: "0.08em",
              color: "rgba(243,244,246,0.35)",
              marginTop: 28,
              lineHeight: 1.6,
            }}
          >
            A Copa do Mundo como você nunca viu.
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "rgba(200,169,107,0.38)",
              marginTop: 12,
            }}
          >
            EUA &nbsp;·&nbsp; CANADÁ &nbsp;·&nbsp; MÉXICO
          </div>
        </div>

        {/* Press any key */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#C8A96B",
            animation: "pesBlink 1.6s ease-in-out infinite",
          }}
        >
          ▶ &nbsp; pressione qualquer tecla &nbsp; ◀
        </div>
      </div>

      <style>{`
        @keyframes gridDrift { to { transform: translate(72px, 72px); } }
        @keyframes orbitSpin {
          from { transform: rotate(0deg) translateX(108px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(108px) rotate(-360deg); }
        }
        @keyframes splashArrive {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes pesBlink {
          0%, 100% { opacity: 0.7; }
          48%, 52% { opacity: 0.05; }
        }
      `}</style>
    </>
  );
}
