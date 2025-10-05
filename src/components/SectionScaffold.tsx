"use client";

export function SectionScaffold({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
      <div className="grid gap-3 sm:gap-4">
        {children}
      </div>
    </main>
  );
}
