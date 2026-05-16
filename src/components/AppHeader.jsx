import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  Menu,
} from "lucide-react";

export default function AppHeader({
  title,
  subtitle,
  centerIcon,
  onTitleClick,

  leftType = "menu", // menu | back | none
  rightType = "bell", // bell | calendar | none

  onMenuClick,
  onBack,
  onBellClick,
  onCalendarClick,

  onPrev,
  onNext,

  rightBadge = true,
}) {
  const renderLeft = () => {
    if (leftType === "none") {
      return <div className="h-11 w-11" />;
    }

    if (leftType === "back") {
      return (
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 place-items-center rounded-2xl text-slate-900 active:bg-slate-100"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.4} />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onMenuClick}
        className="grid h-11 w-11 place-items-center rounded-2xl text-slate-900 active:bg-slate-100"
      >
        <Menu className="h-7 w-7" strokeWidth={2.4} />
      </button>
    );
  };

  const renderRight = () => {
    if (rightType === "none") {
      return <div className="h-11 w-11" />;
    }

    if (rightType === "calendar") {
      return (
        <button
          type="button"
          onClick={onCalendarClick}
          className="grid h-11 w-11 place-items-center rounded-2xl text-slate-900 active:bg-slate-100"
        >
          <CalendarDays className="h-7 w-7" strokeWidth={2.25} />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onBellClick}
        className="relative grid h-11 w-11 place-items-center rounded-2xl text-slate-900 active:bg-slate-100"
      >
        <Bell className="h-7 w-7" strokeWidth={2.25} />
        {rightBadge && (
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>
    );
  };

  return (
    <header className="relative mb-4 flex h-12 items-center justify-between">
      {renderLeft()}

      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 px-1">
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="grid h-9 w-8 shrink-0 place-items-center rounded-xl text-slate-400 active:bg-slate-100"
          >
            <ChevronRight className="h-5 w-5 rotate-180" strokeWidth={2.6} />
          </button>
        )}

        <button
          type="button"
          onClick={onTitleClick}
          className="flex min-w-0 items-center gap-2 px-1 active:scale-[0.98]"
        >
          {centerIcon && <span className="shrink-0">{centerIcon}</span>}

          <div className="min-w-0 text-center">
            <p className="truncate text-[16px] font-extrabold tracking-[-0.03em] text-slate-950">
              {title}
            </p>
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </button>

        {onNext && (
          <button
            type="button"
            onClick={onNext}
            className="grid h-9 w-8 shrink-0 place-items-center rounded-xl text-slate-400 active:bg-slate-100"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
          </button>
        )}
      </div>

      {renderRight()}
    </header>
  );
}