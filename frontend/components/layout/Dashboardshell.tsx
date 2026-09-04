import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ModeBanner } from "./ModeBanner";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 15% 10%, hsl(var(--accent-teal) / 0.08), transparent 40%), radial-gradient(circle at 85% 90%, hsl(var(--accent-violet) / 0.08), transparent 40%)",
        }}
      />
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Header />
        <ModeBanner />
        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}