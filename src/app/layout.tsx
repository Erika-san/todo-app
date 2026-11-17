import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// お手本と同じ書体。CSS変数として <html> に付け、globals.css のフォントトークンから参照する
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// 日本語フォントは大きいので先読み(preload)はしない。必要な文字の分だけ自動で読み込まれる
const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "シンプルTodo",
  description: "1人用のWeb Todoアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" data-theme="blue" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body>{children}</body>
    </html>
  );
}
