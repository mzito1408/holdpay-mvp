"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 250;

function isInternalRouteChange(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");

  if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.origin !== currentUrl.origin) return false;
  if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) return false;

  return true;
}

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => `${pathname}?${searchParams.toString()}`, [pathname, searchParams]);

  const [isLoading, setIsLoading] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const previousRouteRef = useRef(routeKey);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement) || !isInternalRouteChange(anchor)) {
        return;
      }

      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      startedAtRef.current = Date.now();
      setIsLoading(true);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    if (previousRouteRef.current === routeKey) {
      return;
    }

    previousRouteRef.current = routeKey;

    if (!isLoading) {
      return;
    }

    const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : MIN_VISIBLE_MS;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    hideTimerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      startedAtRef.current = null;
      hideTimerRef.current = null;
    }, remaining);
  }, [isLoading, routeKey]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] bg-white/78 backdrop-blur-[2px]">
      <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-sky-100">
        <div className="h-full w-1/3 animate-pulse rounded-r-full bg-sky-500" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Loading page…</p>
              <p className="text-sm text-slate-500">Just a moment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}