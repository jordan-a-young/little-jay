import { createContext, useContext, type ReactNode } from "react";
import { Card, CardContent } from "@littlejay/ui";

export type PreviewWidth = "fluid" | "640" | "320";
export const PreviewContext = createContext<{ width: PreviewWidth; resetCount: number }>({
  width: "fluid",
  resetCount: 0,
});

export function PreviewFrame({ exampleId, children }: { exampleId: string; children: ReactNode }) {
  const { width, resetCount } = useContext(PreviewContext);
  return (
    <Card className="catalog-preview-track">
      <CardContent>
        <div
          className="catalog-preview"
          style={{ width: width === "fluid" ? "100%" : `${width}px` }}
        >
          <div key={`${exampleId}:${resetCount}`} className="min-w-0">
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
