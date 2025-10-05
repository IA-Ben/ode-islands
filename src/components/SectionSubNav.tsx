"use client";

type Item = {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
};

export function SectionSubNav({
  items,
  activeId,
  onChange,
  rightSlot,
}: {
  items: Item[];
  activeId: string;
  onChange: (id: string) => void;
  rightSlot?: React.ReactNode;
}) {
  const base =
    "px-3 sm:px-4 h-9 rounded-full text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400";
  const active = "bg-fuchsia-600 text-white shadow";
  const idle =
    "text-slate-200/90 hover:bg-white/10";

  return (
    <div className="sticky top-14 z-30 bg-slate-900/70 backdrop-blur border-b border-white/10">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2">
        <nav className="flex items-center gap-1 bg-white/5 rounded-full p-1 overflow-x-auto scrollbar-hide">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`${base} ${activeId === id ? active : idle} whitespace-nowrap`}
              aria-current={activeId === id ? "page" : undefined}
            >
              <span className="inline-flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </span>
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {rightSlot}
        </div>
      </div>
    </div>
  );
}
