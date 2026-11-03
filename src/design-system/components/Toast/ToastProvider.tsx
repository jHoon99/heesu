"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { overlay } from "../../motion/motion";
import { Toast, type ToastProps } from "./Toast";

export type ToastInput = {
  tone?: ToastProps["tone"];
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  show: (toast: ToastInput) => void;
  dismiss: () => void;
};

const AUTO_DISMISS_MS = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{
    id: number;
    toast: ToastInput;
  } | null>(null);
  const nextId = useRef(0);

  const show = useCallback((toast: ToastInput) => {
    nextId.current += 1;
    setCurrent({ id: nextId.current, toast });
  }, []);
  const dismiss = useCallback(() => setCurrent(null), []);

  const currentId = current?.id;
  const isDanger = current?.toast.tone === "danger";
  useEffect(() => {
    if (currentId === undefined || isDanger) return;
    const timer = setTimeout(() => setCurrent(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [currentId, isDanger]);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  const toast = current?.toast;
  const needsClose = toast?.tone === "danger" && !toast.actionLabel;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar)+16px+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6">
        <AnimatePresence mode="wait">
          {current && toast ? (
            <motion.div
              key={current.id}
              {...overlay.toast}
              className="pointer-events-auto max-w-full"
            >
              <Toast
                tone={toast.tone}
                actionLabel={needsClose ? "닫기" : toast.actionLabel}
                onAction={needsClose ? dismiss : toast.onAction}
              >
                {toast.message}
              </Toast>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast는 ToastProvider 안에서만 쓸 수 있어요.");
  }
  return ctx;
}
