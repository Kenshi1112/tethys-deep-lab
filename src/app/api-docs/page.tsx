import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import ApiSection from "@/components/ApiSection";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "เอกสาร API — Tethys' Deep" };

export default function ApiDocs() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <PageHeader icon={<Terminal size={14} />} badge="API สาธารณะ" title="เอกสาร API">
        วิธีทำงานของระบบ และ endpoint ทั้งหมดที่แชทบอทเรียกใช้ พร้อมฟอร์มลองยิงและตัวอย่าง curl
      </PageHeader>
      <ApiSection />
    </main>
  );
}
