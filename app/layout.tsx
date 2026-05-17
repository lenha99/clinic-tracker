import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "외래 방문 트래커",
  description: "외래 일정과 방문 기록을 관리하는 트래커",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
