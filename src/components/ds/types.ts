import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export type TajButtonVariant = "primary" | "secondary" | "ghost" | "glass" | "danger" | "success";
export type TajButtonSize = "sm" | "md" | "lg";

export type TajButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: TajButtonVariant;
  size?: TajButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  asChild?: false;
};

export type TajInputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
  inputSize?: "md" | "lg";
  tone?: "dashboard" | "public";
};

export type TajCardPadding = "none" | "sm" | "md" | "lg";
export type TajCardVariant = "default" | "elevated" | "public" | "outline";

export type SlotProps = {
  children?: ReactNode;
  className?: string;
};
