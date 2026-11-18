"use client";

import Script from "next/script";
import { BOTNOI } from "@/config";

declare global {
  interface Window {
    BN?: { init: (options: { version: string }) => void };
  }
}

// Botnoi's attributes use underscores, which JSX types do not know, so they are passed as a spread.
const widgetAttrs = {
  bot_id: BOTNOI.botId,
  bot_logo: BOTNOI.logo,
  bot_name: BOTNOI.name,
  theme_color: BOTNOI.themeColor,
  locale: BOTNOI.locale,
  logged_in_greeting: BOTNOI.welcome,
  greeting_message: BOTNOI.greeting,
  default_open: String(BOTNOI.defaultOpen),
} as Record<string, string>;

// The widget draws its logo as a square picture inside a round button. Its shadow root is open,
// so a small style sheet can round the logo and add a ring + glow that match the site.
const WIDGET_CSS = `
  .bn-badge { padding: 0 !important; overflow: hidden; background: #fff !important;
    border: 2px solid var(--bn-accent, #0288D1) !important;
    box-shadow: 0 0 0 4px rgba(79,195,247,.22), 0 8px 24px rgba(2,136,209,.45) !important; }
  .bn-logo { width: 100% !important; height: 100% !important; }
  .bn-logo, .bn-panel img { border-radius: 50% !important; object-fit: cover !important; object-position: center 18% !important; }
`;

function styleWidget() {
  let tries = 0;
  const timer = setInterval(() => {
    const root = document.querySelector(".bn-host")?.shadowRoot;
    if (root && root.querySelector(".bn-badge")) {
      clearInterval(timer);
      if (!root.querySelector("style[data-tethys]")) {
        const style = document.createElement("style");
        style.setAttribute("data-tethys", "");
        style.textContent = WIDGET_CSS;
        root.appendChild(style);
      }
    } else if (++tries > 50) clearInterval(timer);
  }, 100);
}

// Same as Botnoi's embed code, but initialised from React: the page has usually finished
// loading before this script arrives, so window.onload would never fire.
function initWidget() {
  let tries = 0;
  const timer = setInterval(() => {
    if (window.BN) {
      clearInterval(timer);
      window.BN.init({ version: "1.0" });
      styleWidget();
    } else if (++tries > 50) clearInterval(timer); // give up after ~5 seconds
  }, 100);
}

export default function BotnoiChat() {
  return (
    <>
      <div id="bn-root" />
      <div className="bn-customerchat" {...widgetAttrs} />
      <Script id="bn-jssdk" src="https://console.botnoi.ai/customerchat/index.js" strategy="afterInteractive" onLoad={initWidget} />
    </>
  );
}
