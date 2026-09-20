// ============================================================
// @xivizley/aurora-ui — Ana Giriş Noktası
// 12 uygulamanın tamamı bu paketten import eder.
// ============================================================

// ─── Atom Bileşenleri ───────────────────────────────────────
export { Button } from "./components/Button/index";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./components/Button/index";

export { Input } from "./components/Input/index";
export type { InputProps, InputSize } from "./components/Input/index";

export { Badge, StatusBadge } from "./components/Badge/index";
export type { BadgeProps, BadgeVariant, BadgeSize, StatusBadgeProps, ServerStatus } from "./components/Badge/index";

export { Card } from "./components/Card/index";
export type { CardProps, CardVariant } from "./components/Card/index";

export { Spinner } from "./components/Spinner/index";
export type { SpinnerProps, SpinnerSize, SpinnerColor } from "./components/Spinner/index";

export { Tooltip } from "./components/Tooltip/index";
export type { TooltipProps, TooltipPosition } from "./components/Tooltip/index";

// ─── Molekül Bileşenleri ────────────────────────────────────
export { MetricGauge } from "./components/MetricGauge/index";
export type { MetricGaugeProps, MetricGaugeSize, MetricThresholds } from "./components/MetricGauge/index";
export { ConsoleViewer } from "./components/ConsoleViewer/index";
export type { ConsoleViewerProps } from "./components/ConsoleViewer/index";
export { Modal } from "./components/Modal/index";
export type { ModalProps, ModalSize } from "./components/Modal/index";
export { Dropdown } from "./components/Dropdown/index";
export type { DropdownProps, DropdownOption, DropdownSize } from "./components/Dropdown/index";
