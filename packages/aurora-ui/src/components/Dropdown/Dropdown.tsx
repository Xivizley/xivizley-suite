import {
  type HTMLAttributes,
  forwardRef,
  useState,
  useRef,
  useEffect,
  type ReactNode,
  useCallback,
  useId,
} from "react";
import { clsx } from "clsx";

// ─── Tipler ──────────────────────────────────────────────────

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export type DropdownSize = "sm" | "md" | "lg";

export interface DropdownProps<T = string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Dropdown seçenekleri */
  options: DropdownOption<T>[];
  /** Seçili değer */
  value?: T;
  /** Seçim değiştiğinde çağrılır */
  onChange?: (value: T) => void;
  /** Boşken görüntülenecek yer tutucu */
  placeholder?: string;
  /** Etiket metni */
  label?: string;
  /** Alt ipucu veya hata */
  error?: string;
  hint?: string;
  /** Boyut */
  size?: DropdownSize;
  /** Devre dışı bırakma */
  disabled?: boolean;
  /** Tam genişlik */
  fullWidth?: boolean;
}

// ─── Boyut Haritaları ───────────────────────────────────────

const triggerSizeStyles: Record<DropdownSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-4 text-base",
};

// ─── Dropdown Bileşeni ──────────────────────────────────────

export const Dropdown = forwardRef<HTMLDivElement, DropdownProps<any>>(
  function Dropdown(
    {
      options,
      value,
      onChange,
      placeholder = "Seçiniz...",
      label,
      error,
      hint,
      size = "md",
      disabled = false,
      fullWidth = false,
      className,
      ...rest
    },
    ref,
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const id = useId();

    const selectedOption = options.find((opt) => opt.value === value);

    // Dışarı tıklama ve Escape tuşuyla kapatma
    const handleClickOutside = useCallback((e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }, []);

    useEffect(() => {
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen, handleClickOutside, handleKeyDown]);

    const handleSelect = (option: DropdownOption<any>) => {
      if (option.disabled) return;
      onChange?.(option.value);
      setIsOpen(false);
    };

    return (
      <div
        ref={ref}
        className={clsx("flex flex-col gap-1.5 relative", fullWidth && "w-full", className)}
        {...rest}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="text-aurora-text-secondary text-[var(--aurora-text-sm)] font-medium"
          >
            {label}
          </label>
        )}

        {/* Dropdown Container */}
        <div ref={containerRef} className="relative w-full">
          {/* Tetikleyici Buton */}
          <button
            id={id}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={clsx(
              "w-full flex items-center justify-between gap-2 rounded-aurora border transition-all text-left",
              "aurora-glass bg-aurora-bg-surface/80",
              triggerSizeStyles[size],
              error
                ? "border-aurora-rose shadow-aurora-danger"
                : isOpen
                ? "border-aurora-cyan shadow-aurora-sm ring-1 ring-aurora-cyan/30"
                : "border-aurora hover:border-aurora-glow",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {selectedOption?.icon && (
                <span className="shrink-0 text-aurora-cyan">{selectedOption.icon}</span>
              )}
              <span
                className={clsx(
                  "truncate",
                  selectedOption ? "text-aurora-text-primary" : "text-aurora-text-muted",
                )}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            </div>

            {/* Ok İkonu */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={clsx(
                "text-aurora-text-muted transition-transform duration-200 shrink-0",
                isOpen && "rotate-180 text-aurora-cyan",
              )}
              aria-hidden="true"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>

          {/* Menü Açılır Katmanı (Pop-up) */}
          {isOpen && (
            <div
              role="listbox"
              className={clsx(
                "absolute z-50 left-0 right-0 mt-1.5 p-1 rounded-aurora border border-aurora-glow/30",
                "aurora-glass bg-aurora-bg-surface/95 shadow-[var(--aurora-shadow-lg)]",
                "max-h-60 overflow-y-auto focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150",
              )}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={String(option.value ?? index)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    className={clsx(
                      "flex items-center justify-between px-3 py-2 rounded-aurora-sm text-xs cursor-pointer select-none transition-colors",
                      option.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-aurora-cyan/15 text-aurora-cyan font-medium"
                        : "text-aurora-text-secondary hover:bg-aurora-elevated hover:text-aurora-text-primary",
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span className="text-[10px] text-aurora-text-muted">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-aurora-cyan shrink-0 ml-2"
                        aria-hidden="true"
                      >
                        <path d="M3.5 8.5l3 3 6-7" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hata veya İpucu */}
        {error ? (
          <p className="text-aurora-rose text-[var(--aurora-text-xs)]">{error}</p>
        ) : hint ? (
          <p className="text-aurora-text-muted text-[var(--aurora-text-xs)]">{hint}</p>
        ) : null}
      </div>
    );
  },
);
