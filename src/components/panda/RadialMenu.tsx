import { type ReactNode, useEffect, useRef } from "react";

interface RadialMenuItem {
  icon: ReactNode;
  label: string;
  action: () => void;
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  onClose: () => void;
}

export function RadialMenu({ items, onClose }: RadialMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  const spacing = 360 / items.length;
  const radius = 80;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-visible">
      {/* Menu items */}
      <div ref={menuRef} className="relative pointer-events-auto">
        {items.map((item, i) => {
          const angle = (spacing * i - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius + 20; // align with pet center (offset by pt-10)
          return (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="radial-menu-btn absolute flex flex-col items-center justify-center w-12 h-12 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-all animate-zoom-in outline-none"
              style={{
                animationDelay: `${i * 0.06}s`,
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                left: "50%",
                top: "50%",
              }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[9px] mt-0.5 text-white/60 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
