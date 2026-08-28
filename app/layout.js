import "./globals.css";

export const metadata = {
  title: "보듬",
  description: "우리 아이 돌봄 기록",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "보듬",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF4D2" },
    { media: "(prefers-color-scheme: dark)", color: "#18150F" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="apple-touch-icon" href="/icon-512.svg" />
        <link rel="preload" as="image" href="/splash.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
