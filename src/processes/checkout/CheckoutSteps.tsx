type Props = {
  steps: [string, string, string];
  activeStep?: number;
};

export function CheckoutSteps({ steps, activeStep = 0 }: Props) {
  return (
    <div className="checkout-stepper" aria-label="Checkout progress">
      {steps.map((label, index) => (
        <div key={label} className="contents">
          <div className="checkout-stepper__step">
            <span
              className={`checkout-stepper__dot ${index < activeStep ? "is-done" : ""} ${index === activeStep ? "is-active" : ""}`}
              aria-hidden
            />
            <span className={`checkout-stepper__label ${index === activeStep ? "is-active" : ""}`}>{label}</span>
          </div>
          {index < steps.length - 1 ? (
            <span className={`checkout-stepper__line ${index < activeStep ? "is-done" : ""}`} aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}
