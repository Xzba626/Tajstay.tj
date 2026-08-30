"use client";

import { createContext, useContext, useState, type FormHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type AdminFormContextValue = {
  busy: boolean;
};

const AdminFormContext = createContext<AdminFormContextValue | null>(null);

export function useAdminFormBusy() {
  return useContext(AdminFormContext);
}

type Props = FormHTMLAttributes<HTMLFormElement> & {
  children: ReactNode;
};

/** Prevents duplicate native form POST while preserving server actions. */
export function AdminNativeForm({ children, className, onSubmit, ...rest }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <AdminFormContext.Provider value={{ busy }}>
      <form
        {...rest}
        className={cn(className, busy && "admin-form--busy")}
        onSubmit={(event) => {
          if (busy) {
            event.preventDefault();
            return;
          }
          if (!event.currentTarget.reportValidity()) {
            return;
          }
          setBusy(true);
          onSubmit?.(event);
        }}
      >
        {children}
      </form>
    </AdminFormContext.Provider>
  );
}
