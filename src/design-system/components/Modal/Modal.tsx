"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { overlay } from "../../motion/motion";

export interface ModalProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  width?: number;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  width = 440,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]);

  function trapTab(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    const current = document.activeElement;
    if (e.shiftKey && (current === first || current === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            {...overlay.scrim}
            aria-hidden="true"
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => onClose?.()}
          />
          <motion.div
            {...overlay.modal}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={trapTab}
            style={{ width, maxWidth: "100%" }}
            className="relative flex max-h-full flex-col rounded-xl bg-bg-surface-raised shadow-lg"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <h2 id={titleId} className="text-h3 text-text">
                {title}
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => onClose?.()}
                className="-mt-1 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-(--dur-instant) hover:bg-bg-subtle"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {children ? (
              <div className="overflow-y-auto px-6 pt-3 text-body text-text-muted">
                {children}
              </div>
            ) : null}
            {footer ? (
              <div className="flex justify-end gap-2 px-6 pt-6 pb-6">
                {footer}
              </div>
            ) : (
              <div className="pb-6" />
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
