import { Card } from "@/shared/ui";

type Props = {
  steps: [string, string, string];
};

export function CheckoutSteps({ steps }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {steps.map((label) => (
        <Card key={label} className="text-sm text-slate-200">
          {label}
        </Card>
      ))}
    </div>
  );
}
