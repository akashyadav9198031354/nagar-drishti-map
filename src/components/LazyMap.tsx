import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type IssueMapType from "./IssueMap";

const IssueMap = lazy(() => import("./IssueMap"));

export function LazyMap(props: ComponentProps<typeof IssueMapType>) {
  const fallback = (
    <div className={`${props.className ?? "h-80"} w-full rounded-xl bg-muted animate-pulse`} />
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <IssueMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
