import type { ComponentProps, ReactNode } from "react";
import illustrations from "@ljay/brand/states/manifest.json" with { type: "json" };
import { EmptyState } from "../empty-state/index.js";

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
  ...props
}: PebbleStateProps) {
  const illustration = illustrations[state];
  const size = Number.isFinite(illustrationSize) && illustrationSize > 0 ? illustrationSize : 160;
  return (
    <EmptyState
      {...props}
      title={
        <>
          <img
            src={`${assetBaseUrl.replace(/\/$/, "")}/states/${illustration.file}`}
            alt=""
            width={illustration.width}
            height={illustration.height}
            loading="lazy"
            decoding="async"
            className="mb-3 block"
            style={{
              width: size,
              maxWidth: "100%",
              height: "auto",
              aspectRatio: "1 / 1",
              objectFit: "contain",
            }}
          />
          {heading}
        </>
      }
      action={action}
    >
      {description}
    </EmptyState>
  );
}
