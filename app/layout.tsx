// app/layout.tsx
import {
  RootLayoutShell,
  rootLayoutMetadata as metadata,
  rootLayoutViewport as viewport,
} from "@/modules/app-shell/presentation";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutShell>{children}</RootLayoutShell>;
}
