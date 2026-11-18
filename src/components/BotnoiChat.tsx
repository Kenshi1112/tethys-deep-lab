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

// Same as Botnoi's embed code, but initialised from React: the page has usually finished
// loading before this script arrives, so window.onload would never fire.
function initWidget() {
  let tries = 0;
  const timer = setInterval(() => {
    if (window.BN) {
      clearInterval(timer);
      window.BN.init({ version: "1.0" });
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
