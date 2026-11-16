import type { ComponentProps, ReactNode } from "react";
import illustrations from "@littlejay/brand/states/manifest.json" with { type: "json" };

export type PebbleStateKind = "loading" | "success" | "error" | "empty";

export type PebbleStateProps = Omit<ComponentProps<"div">, "title" | "children"> & {
  state: PebbleStateKind;
  heading: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** URL of the synchronized branding directory, including the application's deployment base. */
  assetBaseUrl: string;
  /** Square illustration box in CSS pixels; constrained to the available width. Defaults to 160. */
  illustrationSize?: number;
};

/** Static, presentational feedback. The application owns announcements, busy regions, and actions. */
export function PebbleState({
  state,
  heading,
  description,
  action,
  assetBaseUrl,
  illustrationSize = 160,
  className = "",
  ...props
}: PebbleStateProps) {
  const illustration = illustrations[state];
  const size = Number.isFinite(illustrationSize) && illustrationSize > 0 ? illustrationSize : 160;
  return (
    <div
      {...props}
      className={`min-w-0 space-y-3 rounded-control border border-dashed border-border bg-surface p-6 text-content ${className}`}
    >
      <img
        src={`${assetBaseUrl.replace(/\/$/, "")}/states/${illustration.file}`}
        alt=""
        width={illustration.width}
        height={illustration.height}
        loading="lazy"
        decoding="async"
        className="block"
        style={{
          width: size,
          maxWidth: "100%",
          height: "auto",
          aspectRatio: "1 / 1",
          objectFit: "contain",
        }}
      />
      <div className="lj-pebble-state-heading font-semibold">{heading}</div>
      {description != null && <div className="break-words text-muted">{description}</div>}
      {action != null && <div>{action}</div>}
    </div>
  );
}
