"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { BOTNOI } from "@/config";

// Chat box for the Shorekeeper bot.
//
// Botnoi's ready-made widget shows its chat page inside an <iframe>, and Botnoi now forbids that
// on other sites ("console.botnoi.ai refused to connect"). So this component draws the chat itself
// and talks to the same bot through Botnoi's web-chat API:
//   POST /api/chat/session  -> our server gets a guest token from Botnoi (see that route)
//   WebSocket to Botnoi     -> send {type:"text", text}; the bot's replies arrive on the same socket

type Msg = {
  id: string;
  role: "user" | "bot";
  text?: string;
  image?: string;
  buttons?: { title: string; postback?: string }[];
};

type BotnoiMessage = {
  mid?: string;
  type?: string;
  text?: string;
  image_url?: string;
  url?: string;
  button_title?: string;
  button_actions?: { title?: string; label?: string; text?: string; postback_data?: string; payload?: string }[];
};

type Status = "connecting" | "online" | "offline";

const UID_KEY = "tethys-chat-uid";
const LOG_KEY = "tethys-chat-log";
const MAX_SAVED = 60;
const TYPING_TIMEOUT_MS = 30_000;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode or full storage: the chat still works, it just forgets after a refresh */
  }
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Turn plain text into text + clickable links.
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="break-all text-glow underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function BotnoiChat() {
  const [open, setOpen] = useState(BOTNOI.defaultOpen);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("connecting");
  const [typing, setTyping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const uidRef = useRef<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const retryRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const startedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopTyping = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    setTyping(false);
  }, []);

  const startTyping = useCallback(() => {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), TYPING_TIMEOUT_MS);
  }, []);

  const addMessage = useCallback((m: Msg) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const handleSocketData = useCallback(
    (raw: string) => {
      let data: {
        type?: string;
        sender?: { sender_type?: string };
        message?: BotnoiMessage;
      };
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }
      if (data.type === "ping" || data.sender?.sender_type !== "bot" || !data.message) return;
      const m = data.message;
      if (m.mid) {
        if (seenRef.current.has(m.mid)) return;
        seenRef.current.add(m.mid);
      }
      const image = m.type === "image" ? (m.image_url ?? m.url) : undefined;
      const buttons = (m.button_actions ?? [])
        .map((b) => ({ title: b.title ?? b.label ?? b.text ?? "", postback: b.postback_data ?? b.payload }))
        .filter((b) => b.title);
      const text = m.text ?? (buttons.length ? m.button_title : undefined);
      if (!text && !image && buttons.length === 0) return;
      stopTyping();
      addMessage({ id: m.mid ?? newId(), role: "bot", text, image, buttons: buttons.length ? buttons : undefined });
    },
    [addMessage, stopTyping],
  );

  const connect = useCallback(async () => {
    if (stoppedRef.current) return;
    setStatus("connecting");
    const scheduleRetry = () => {
      if (stoppedRef.current) return;
      setStatus("offline");
      const wait = Math.min(1000 * 2 ** retryRef.current, 15_000);
      retryRef.current += 1;
      retryTimer.current = setTimeout(connect, wait);
    };
    try {
      const res = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: uidRef.current ?? undefined }),
      });
      const s = (await res.json()) as { ok: boolean; uid: string; access_token: string; ws_url: string };
      if (!s.ok) throw new Error("session failed");
      uidRef.current = s.uid;
      writeStorage(UID_KEY, s.uid);

      const ws = new WebSocket(`${s.ws_url}?access_token=${encodeURIComponent(s.access_token)}`);
      wsRef.current = ws;
      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("online");
      };
      ws.onmessage = (e) => handleSocketData(String(e.data));
      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        stopTyping();
        scheduleRetry();
      };
    } catch {
      scheduleRetry();
    }
  }, [handleSocketData, stopTyping]);

  // Restore the previous conversation after a refresh.
  useEffect(() => {
    uidRef.current = readStorage(UID_KEY);
    try {
      const saved = JSON.parse(readStorage(LOG_KEY) ?? "[]") as Msg[];
      if (Array.isArray(saved)) {
        setMessages(saved);
        saved.forEach((m) => seenRef.current.add(m.id));
      }
    } catch {
      /* ignore a broken saved log */
    }
  }, []);

  useEffect(() => {
    if (messages.length) writeStorage(LOG_KEY, JSON.stringify(messages.slice(-MAX_SAVED)));
  }, [messages]);

  // Connect the first time the chat is opened, and close the socket when the page goes away.
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      stoppedRef.current = false;
      connect();
    }
  }, [open, connect]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      startedRef.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      const ws = wsRef.current;
      wsRef.current = null;
      ws?.close();
    };
  }, []);

  // Keep the newest message in view; focus the box when the chat opens.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendRaw = useCallback(
    (payload: object, shown: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify(payload));
      addMessage({ id: newId(), role: "user", text: shown });
      startTyping();
      return true;
    },
    [addMessage, startTyping],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (sendRaw({ type: "text", text }, text)) setInput("");
  }

  function pressButton(b: { title: string; postback?: string }) {
    if (b.postback) sendRaw({ type: "postback", text: b.title, postback_data: b.postback }, b.title);
    else sendRaw({ type: "text", text: b.title }, b.title);
  }

  const statusText =
    status === "online" ? "ออนไลน์" : status === "connecting" ? "กำลังเชื่อมต่อ…" : "การเชื่อมต่อหลุด กำลังลองใหม่…";

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={`แชทกับ ${BOTNOI.name}`}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="fixed bottom-24 right-3 z-50 flex h-[min(34rem,calc(100dvh-7.5rem))] w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-deep shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] sm:right-5"
        >
          <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: BOTNOI.themeColor }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BOTNOI.logo} alt="" className="h-9 w-9 rounded-full border border-white/60 bg-white object-cover object-[center_18%]" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{BOTNOI.name}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/85">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status === "online" ? "bg-emerald-300" : "animate-pulse bg-amber-300"}`}
                />
                {statusText}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิดแชท"
              className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/15"
            >
              <X size={18} />
            </button>
          </header>

          <div ref={listRef} role="log" aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
            <Bubble role="bot">{BOTNOI.welcome}</Bubble>
            {messages.map((m) => (
              <Bubble key={m.id} role={m.role}>
                {m.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" className="mb-1.5 max-h-48 rounded-lg" />
                )}
                {m.text && <Linkified text={m.text} />}
                {m.buttons && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {m.buttons.map((b) => (
                      <button
                        key={b.title}
                        type="button"
                        onClick={() => pressButton(b)}
                        className="rounded-full border border-glow/50 px-3 py-1 text-xs text-glow transition hover:bg-glow/10"
                      >
                        {b.title}
                      </button>
                    ))}
                  </span>
                )}
              </Bubble>
            ))}
            {typing && (
              <Bubble role="bot">
                <span className="flex items-center gap-1 py-1" aria-label="กำลังพิมพ์">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              </Bubble>
            )}
          </div>

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 bg-abyss/60 p-2.5">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={status === "online" ? 'พิมพ์ "ชอร์" เพื่อเริ่ม' : "กำลังเชื่อมต่อ…"}
              maxLength={500}
              autoComplete="off"
              aria-label="พิมพ์ข้อความ"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-deep px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-glow/60"
            />
            <button
              type="submit"
              disabled={status !== "online" || !input.trim()}
              aria-label="ส่งข้อความ"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition enabled:hover:brightness-110 disabled:opacity-40"
              style={{ background: BOTNOI.themeColor }}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "ปิดแชท" : `เปิดแชทกับ ${BOTNOI.name}`}
        aria-expanded={open}
        className="fixed bottom-4 right-3 z-50 flex h-[3.75rem] w-[3.75rem] items-center justify-center overflow-hidden rounded-full border-2 bg-white transition hover:scale-105 sm:right-5"
        style={{
          borderColor: BOTNOI.themeColor,
          boxShadow: "0 0 0 4px rgba(79,195,247,.22), 0 8px 24px rgba(2,136,209,.45)",
        }}
      >
        {open ? (
          <MessageCircle size={26} style={{ color: BOTNOI.themeColor }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={BOTNOI.logo} alt="" className="h-full w-full object-cover object-[center_18%]" />
        )}
      </button>
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "bot"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
          mine ? "rounded-br-md text-white" : "rounded-bl-md border border-white/10 bg-white/[0.06] text-slate-100"
        }`}
        style={mine ? { background: BOTNOI.themeColor } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
