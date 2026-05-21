"use client";

type Method = "phone" | "email";

type Props = {
  method: Method;
  onChange: (method: Method) => void;
  phoneLabel: string;
  emailLabel: string;
};

export function AuthMethodTabs({ method, onChange, phoneLabel, emailLabel }: Props) {
  return (
    <div className="rounded-xl bg-brand-900 p-1">
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onChange("phone")}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
            method === "phone" ? "bg-brand-500 text-white" : "text-brand-200 hover:text-white"
          }`}
        >
          {phoneLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange("email")}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
            method === "email" ? "bg-brand-500 text-white" : "text-brand-200 hover:text-white"
          }`}
        >
          {emailLabel}
        </button>
      </div>
    </div>
  );
}
