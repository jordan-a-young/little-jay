export type FeedbackTone = "neutral" | "info" | "success" | "warning" | "danger";

export const feedbackToneClasses: Record<FeedbackTone, string> = {
  neutral: "text-muted",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};
