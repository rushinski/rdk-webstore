// app/layout.tsx

import "@/styles/global.css";

export const metadata = {
  title: "Real Deal Kickz",
  description: "Built for resellers who move fast.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
