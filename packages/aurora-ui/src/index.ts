// ============================================================
// @xivizley/aurora-ui — Ana Giriş Noktası
// 12 uygulamanın tamamı bu paketten import eder.
// ============================================================

// ─── Atom Bileşenleri ───────────────────────────────────────
export { Button } from "./components/Button/index.js";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./components/Button/index.js";

export { Input } from "./components/Input/index.js";
export type { InputProps, InputSize } from "./components/Input/index.js";

export { Badge, StatusBadge } from "./components/Badge/index.js";
export type { BadgeProps, BadgeVariant, BadgeSize, StatusBadgeProps, ServerStatus } from "./components/Badge/index.js";

export { Card } from "./components/Card/index.js";
export type { CardProps, CardVariant } from "./components/Card/index.js";

export { Spinner } from "./components/Spinner/index.js";
export type { SpinnerProps, SpinnerSize, SpinnerColor } from "./components/Spinner/index.js";

export { Tooltip } from "./components/Tooltip/index.js";
export type { TooltipProps, TooltipPosition } from "./components/Tooltip/index.js";

// ─── Molekül Bileşenleri ────────────────────────────────────
export { MetricGauge } from "./components/MetricGauge/index.js";
export type { MetricGaugeProps, MetricGaugeSize, MetricThresholds } from "./components/MetricGauge/index.js";
export { ConsoleViewer } from "./components/ConsoleViewer/index.js";
export type { ConsoleViewerProps } from "./components/ConsoleViewer/index.js";
export { Modal } from "./components/Modal/index.js";
export type { ModalProps, ModalSize } from "./components/Modal/index.js";
export { Dropdown } from "./components/Dropdown/index.js";
export type { DropdownProps, DropdownOption, DropdownSize } from "./components/Dropdown/index.js";

// ─── Organizma Bileşenleri (Adım 3 sonrası eklenecek) ──────
// export { SuiteNavbar } from "./components/SuiteNavbar/index.js";
// export { Sidebar } from "./components/Sidebar/index.js";
