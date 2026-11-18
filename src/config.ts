// How often the board refreshes (milliseconds).
export const POLL_INTERVAL_MS = 3000;

// Botnoi chat widget settings (the embed snippet from Botnoi, see src/components/BotnoiChat.tsx).
// bot_id and the logo are public by design: they are visible in any embed code.
export const BOTNOI = {
  botId: "6afbe42fab20ee8b1fb71cbe",
  apiBase: "https://api-gateway.botnoi.ai", // Botnoi web-chat API (guest session)
  wsBase: "wss://api-gateway.botnoi.ai", // Botnoi web-chat WebSocket (messages in and out)
  logo: "https://bn-sme-production-ap-southeast-1.s3.amazonaws.com/profile/6ba4deec-f89d-41aa-a8e5-3c4c741b3f04.jpg",
  name: "Shorekeeper",
  themeColor: "#0288D1", // header / bubble color of the widget (white text stays readable)
  locale: "th",
  welcome: "สวัสดีค่ะ ดิฉัน Shorekeeper ผู้ดูแลศูนย์วิจัยใต้ดิน Tethys' Deep พิมพ์ \"ชอร์\" เพื่อเริ่มลงชื่อเข้า/ออกห้องวิจัยได้เลยค่ะ",
  greeting: "พิมพ์ \"ชอร์\" เพื่อเริ่ม แล้วเลือกลงชื่อเข้าหรือลงชื่อออกห้องวิจัยได้เลยค่ะ",
  defaultOpen: false, // true = chat window is open when the page loads
};
