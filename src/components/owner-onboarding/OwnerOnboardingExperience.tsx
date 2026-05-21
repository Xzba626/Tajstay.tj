"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { OwnerOnboardingLabels } from "@/lib/i18n/ownerOnboarding";
import type { OwnerAppNavState } from "@/lib/navigation/getNavContext";
import { normalizePhone } from "@/lib/validation/phone";
import { OwnerOnboardingSidebar } from "@/components/owner-onboarding/OwnerOnboardingSidebar";
import { OwnerStatusPanel } from "@/components/owner-onboarding/OwnerStatusPanel";
import { FileUploadCard } from "@/components/owner-onboarding/FileUploadCard";

type Defaults = { fullName: string; phone: string; email: string };

type FieldErrors = Record<string, string>;

type UploadState = {
  identity: File | null;
  identityBack: File | null;
  selfie: File | null;
  facade: File | null;
  room: File | null;
  bathroom: File | null;
  propertyDoc: File | null;
};

const MAX_FILE = 5 * 1024 * 1024;
const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  L: OwnerOnboardingLabels;
  ownerNav: OwnerAppNavState;
  defaults: Defaults;
};

function useIsMobileWizard() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

function Field({
  id,
  label,
  required,
  optionalLabel,
  requiredLabel,
  error,
  children
}: {
  id: string;
  label: string;
  required?: boolean;
  optionalLabel: string;
  requiredLabel: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="owner-field">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-slate-100">
          {label}
        </label>
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {required ? requiredLabel : optionalLabel}
        </span>
      </div>
      {children}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-xs font-medium text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function OwnerOnboardingExperience({ L, ownerNav, defaults }: Props) {
  const mobileWizard = useIsMobileWizard();
  const [wizardStep, setWizardStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [fullName, setFullName] = useState(defaults.fullName);
  const [phone, setPhone] = useState(defaults.phone);
  const [email, setEmail] = useState(defaults.email);
  const [city, setCity] = useState("");
  const [applicantType, setApplicantType] = useState("individual");
  const [businessName, setBusinessName] = useState("");
  const [propertyType, setPropertyType] = useState("hotel");
  const [address, setAddress] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [guestCapacity, setGuestCapacity] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [experience, setExperience] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [adminComment, setAdminComment] = useState("");
  const [consent, setConsent] = useState(false);

  const [uploads, setUploads] = useState<UploadState>({
    identity: null,
    identityBack: null,
    selfie: null,
    facade: null,
    room: null,
    bathroom: null,
    propertyDoc: null
  });

  const setUpload = useCallback((key: keyof UploadState, file: File | null) => {
    setUploads((prev) => ({ ...prev, [key]: file }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const wizardLabels = [L.wizardStep1, L.wizardStep2, L.wizardStep3, L.wizardStep4];

  function validateFile(file: File | null, required: boolean): string | undefined {
    if (!file) return required ? L.errUpload : undefined;
    if (!ACCEPT_TYPES.includes(file.type)) return L.errFileType;
    if (file.size > MAX_FILE) return L.errFileSize;
    return undefined;
  }

  function validateStep(step: number): FieldErrors {
    const e: FieldErrors = {};
    if (step === 0) {
      if (!fullName.trim()) e.fullName = L.errRequired;
      if (!normalizePhone(phone)) e.phone = L.errPhone;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = L.errEmail;
      if (!city.trim()) e.city = L.errRequired;
    }
    if (step === 1) {
      if (!businessName.trim()) e.businessName = L.errRequired;
      if (!address.trim()) e.address = L.errRequired;
    }
    if (step === 2) {
      const idErr = validateFile(uploads.identity, true);
      if (idErr) e.identity = idErr;
      const fErr = validateFile(uploads.facade, true);
      if (fErr) e.facade = fErr;
      const rErr = validateFile(uploads.room, true);
      if (rErr) e.room = rErr;
      const bErr = validateFile(uploads.bathroom, true);
      if (bErr) e.bathroom = bErr;
      if (uploads.identityBack) {
        const ib = validateFile(uploads.identityBack, false);
        if (ib) e.identityBack = ib;
      }
      if (uploads.selfie) {
        const s = validateFile(uploads.selfie, false);
        if (s) e.selfie = s;
      }
      if (documentUrl.trim() && !documentUrl.trim().toLowerCase().startsWith("https://")) {
        e.documentUrl = L.errHttps;
      }
    }
    if (step === 3) {
      if (!consent) e.consent = L.errConsent;
    }
    return e;
  }

  function validateAll(): FieldErrors {
    let e: FieldErrors = {};
    for (let i = 0; i < 4; i++) e = { ...e, ...validateStep(i) };
    return e;
  }

  const showForm = ownerNav.kind === "none" || ownerNav.kind === "rejected";

  async function submit() {
    const allErrors = validateAll();
    setErrors(allErrors);
    if (Object.keys(allErrors).length) {
      if (mobileWizard) {
        const firstStep = [0, 1, 2, 3].find((s) => Object.keys(validateStep(s)).length > 0) ?? 0;
        setWizardStep(firstStep);
      }
      return;
    }

    setLoading(true);
    setFormError(null);
    const fd = new FormData();
    fd.append("fullName", fullName.trim());
    fd.append("phone", phone.trim());
    fd.append("email", email.trim());
    fd.append("businessName", businessName.trim());
    fd.append("applicantType", applicantType);
    fd.append("city", city.trim());
    fd.append("propertyType", propertyType);
    fd.append("address", address.trim());
    if (roomCount) fd.append("roomCount", roomCount);
    if (guestCapacity) fd.append("guestCapacity", guestCapacity);
    if (propertyDescription) fd.append("propertyDescription", propertyDescription);
    if (documentUrl.trim()) fd.append("documentUrl", documentUrl.trim());
    if (experience) fd.append("experience", experience);
    if (houseRules) fd.append("houseRules", houseRules);
    if (adminComment) fd.append("adminComment", adminComment);
    fd.append("consent", "true");
    if (uploads.identity) fd.append("identity", uploads.identity);
    if (uploads.identityBack) fd.append("identityBack", uploads.identityBack);
    if (uploads.selfie) fd.append("selfie", uploads.selfie);
    if (uploads.facade) fd.append("facade", uploads.facade);
    if (uploads.room) fd.append("room", uploads.room);
    if (uploads.bathroom) fd.append("bathroom", uploads.bathroom);
    if (uploads.propertyDoc) fd.append("propertyDoc", uploads.propertyDoc);

    try {
      const res = await fetch("/api/owner/applications", {
        method: "POST",
        credentials: "include",
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? L.errGeneric);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : L.errGeneric);
    } finally {
      setLoading(false);
    }
  }

  const personalSection = (
    <section className="owner-form-section" aria-labelledby="sec-personal">
      <h3 id="sec-personal" className="owner-section-title">
        {L.sectionPersonal}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label={L.fullName} required optionalLabel={L.optional} requiredLabel={L.required} error={errors.fullName}>
          <input id="fullName" className="owner-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={L.fullNamePh} autoComplete="name" />
        </Field>
        <Field id="phone" label={L.phone} required optionalLabel={L.optional} requiredLabel={L.required} error={errors.phone}>
          <input id="phone" className="owner-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={L.phonePh} type="tel" inputMode="tel" autoComplete="tel" />
        </Field>
        <Field id="email" label={L.email} required optionalLabel={L.optional} requiredLabel={L.required} error={errors.email}>
          <input id="email" className="owner-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={L.emailPh} type="email" inputMode="email" autoComplete="email" />
        </Field>
        <Field id="city" label={L.city} required optionalLabel={L.optional} requiredLabel={L.required} error={errors.city}>
          <input id="city" className="owner-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder={L.cityPh} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="applicantType" label={L.applicantType} required optionalLabel={L.optional} requiredLabel={L.required}>
            <select id="applicantType" className="owner-input" value={applicantType} onChange={(e) => setApplicantType(e.target.value)}>
              <option value="individual">{L.applicantIndividual}</option>
              <option value="entrepreneur">{L.applicantEntrepreneur}</option>
              <option value="company">{L.applicantCompany}</option>
            </select>
          </Field>
        </div>
      </div>
    </section>
  );

  const propertySection = (
    <section className="owner-form-section" aria-labelledby="sec-property">
      <h3 id="sec-property" className="owner-section-title">
        {L.sectionProperty}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="businessName" label={L.businessName} required optionalLabel={L.optional} requiredLabel={L.required} error={errors.businessName}>
          <input id="businessName" className="owner-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder={L.businessNamePh} />
        </Field>
        <Field id="propertyType" label={L.propertyType} required optionalLabel={L.optional} requiredLabel={L.required}>
          <select id="propertyType" className="owner-input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="hotel">{L.propertyHotel}</option>
            <option value="hostel">{L.propertyHostel}</option>
            <option value="apartment">{L.propertyApartment}</option>
            <option value="house">{L.propertyHouse}</option>
            <option value="cottage">{L.propertyCottage}</option>
            <option value="resort">{L.propertyResort}</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field id="address" label={L.address} required optionalLabel={L.optional} requiredLabel={L.required} error={errors.address}>
            <input id="address" className="owner-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={L.addressPh} />
          </Field>
        </div>
        <Field id="roomCount" label={L.roomCount} optionalLabel={L.optional} requiredLabel={L.required}>
          <input id="roomCount" className="owner-input" value={roomCount} onChange={(e) => setRoomCount(e.target.value)} placeholder={L.roomCountPh} inputMode="numeric" />
        </Field>
        <Field id="guestCapacity" label={L.guestCapacity} optionalLabel={L.optional} requiredLabel={L.required}>
          <input id="guestCapacity" className="owner-input" value={guestCapacity} onChange={(e) => setGuestCapacity(e.target.value)} placeholder={L.guestCapacityPh} inputMode="numeric" />
        </Field>
        <div className="sm:col-span-2">
          <Field id="propertyDescription" label={L.propertyDescription} optionalLabel={L.optional} requiredLabel={L.required}>
            <textarea id="propertyDescription" className="owner-input min-h-[96px] resize-y" value={propertyDescription} onChange={(e) => setPropertyDescription(e.target.value)} placeholder={L.propertyDescriptionPh} rows={3} />
          </Field>
        </div>
      </div>
    </section>
  );

  const documentsSection = (
    <section className="owner-form-section" aria-labelledby="sec-docs">
      <h3 id="sec-docs" className="owner-section-title">
        {L.sectionDocuments}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FileUploadCard name="identity" label={L.uploadIdentity} required chooseLabel={L.uploadChoose} removeLabel={L.uploadRemove} reqLabel={L.uploadReq} optionalLabel={L.optional} requiredLabel={L.required} error={errors.identity} onFileChange={(f) => setUpload("identity", f)} />
        <FileUploadCard name="identityBack" label={L.uploadIdentityBack} hint={L.uploadIdentityBackHint} chooseLabel={L.uploadChoose} removeLabel={L.uploadRemove} reqLabel={L.uploadReq} optionalLabel={L.optional} requiredLabel={L.required} error={errors.identityBack} onFileChange={(f) => setUpload("identityBack", f)} />
        <FileUploadCard name="facade" label={L.uploadFacade} required chooseLabel={L.uploadChoose} removeLabel={L.uploadRemove} reqLabel={L.uploadReq} optionalLabel={L.optional} requiredLabel={L.required} error={errors.facade} onFileChange={(f) => setUpload("facade", f)} />
        <FileUploadCard name="room" label={L.uploadRoom} required chooseLabel={L.uploadChoose} removeLabel={L.uploadRemove} reqLabel={L.uploadReq} optionalLabel={L.optional} requiredLabel={L.required} error={errors.room} onFileChange={(f) => setUpload("room", f)} />
        <FileUploadCard name="bathroom" label={L.uploadBathroom} required chooseLabel={L.uploadChoose} removeLabel={L.uploadRemove} reqLabel={L.uploadReq} optionalLabel={L.optional} requiredLabel={L.required} error={errors.bathroom} onFileChange={(f) => setUpload("bathroom", f)} />
        <FileUploadCard name="selfie" label={L.uploadSelfie} hint={L.uploadSelfieHint} chooseLabel={L.uploadChoose} removeLabel={L.uploadRemove} reqLabel={L.uploadReq} optionalLabel={L.optional} requiredLabel={L.required} error={errors.selfie} onFileChange={(f) => setUpload("selfie", f)} />
        <FileUploadCard name="propertyDoc" label={L.uploadPropertyDoc} hint={L.uploadPropertyDocHint} chooseLabel={L.uploadChoose} removeLabel={L.uploadRemove} reqLabel={L.uploadReq} optionalLabel={L.optional} requiredLabel={L.required} error={errors.propertyDoc} onFileChange={(f) => setUpload("propertyDoc", f)} />
      </div>
      <div className="mt-4">
        <Field id="documentUrl" label={L.documentUrl} optionalLabel={L.optional} requiredLabel={L.required} error={errors.documentUrl}>
          <input id="documentUrl" className="owner-input" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder={L.documentUrlPh} type="url" inputMode="url" />
          <p className="mt-1 text-xs text-slate-400">{L.documentUrlHelp}</p>
        </Field>
      </div>
    </section>
  );

  const extraSection = (
    <section className="owner-form-section" aria-labelledby="sec-extra">
      <h3 id="sec-extra" className="owner-section-title">
        {L.sectionExtra}
      </h3>
      <div className="mt-4 grid gap-4">
        <Field id="experience" label={L.experience} optionalLabel={L.optional} requiredLabel={L.required}>
          <textarea id="experience" className="owner-input min-h-[80px]" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder={L.experiencePh} rows={2} />
        </Field>
        <Field id="houseRules" label={L.houseRules} optionalLabel={L.optional} requiredLabel={L.required}>
          <textarea id="houseRules" className="owner-input min-h-[80px]" value={houseRules} onChange={(e) => setHouseRules(e.target.value)} placeholder={L.houseRulesPh} rows={2} />
        </Field>
        <Field id="adminComment" label={L.adminComment} optionalLabel={L.optional} requiredLabel={L.required}>
          <textarea id="adminComment" className="owner-input min-h-[80px]" value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder={L.adminCommentPh} rows={2} />
        </Field>
      </div>
    </section>
  );

  const reviewSection = (
    <section className="owner-form-section" aria-labelledby="sec-review">
      <h3 id="sec-review" className="owner-section-title">
        {L.sectionReview}
      </h3>
      <div className="owner-trust-callout mt-4 lg:hidden">
        <div className="flex gap-3">
          <span className="text-lg" aria-hidden>
            🛡
          </span>
          <div>
            <p className="text-sm font-bold text-white">{L.trustBoxTitle}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              <li>{L.trustBox1}</li>
              <li>{L.trustBox2}</li>
            </ul>
          </div>
        </div>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 text-emerald-500" />
        <span className="text-sm text-slate-200">{L.consent}</span>
      </label>
      {errors.consent ? (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {errors.consent}
        </p>
      ) : null}
    </section>
  );

  const sections = [personalSection, propertySection, documentsSection, reviewSection];
  const desktopForm = (
    <>
      {personalSection}
      {propertySection}
      {documentsSection}
      {extraSection}
      {reviewSection}
    </>
  );

  const mobileStepContent = useMemo(() => {
    if (wizardStep === 0) return personalSection;
    if (wizardStep === 1) return propertySection;
    if (wizardStep === 2) return documentsSection;
    return (
      <>
        {extraSection}
        {reviewSection}
      </>
    );
  }, [wizardStep, personalSection, propertySection, documentsSection, extraSection, reviewSection]);

  function nextStep() {
    const stepErrors = validateStep(wizardStep);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) return;
    setWizardStep((s) => Math.min(3, s + 1));
  }

  function prevStep() {
    setWizardStep((s) => Math.max(0, s - 1));
  }

  if (submitted) {
    return (
      <div className="owner-onboarding-page">
        <OwnerStatusPanel variant="success" L={L} />
      </div>
    );
  }

  if (ownerNav.kind === "pending") {
    return (
      <div className="owner-onboarding-page">
        <OwnerStatusPanel variant="pending" L={L} />
      </div>
    );
  }

  if (ownerNav.kind === "approved") {
    return (
      <div className="owner-onboarding-page">
        <OwnerStatusPanel variant="approved" L={L} />
      </div>
    );
  }

  return (
    <div className="owner-onboarding-page">
      <Link href="/profile" className="mb-6 inline-flex text-sm font-semibold text-slate-400 hover:text-white">
        ← {L.backProfile}
      </Link>

      {ownerNav.kind === "rejected" ? <OwnerStatusPanel variant="rejected" L={L} rejectComment={ownerNav.comment} /> : null}

      {showForm ? (
        <div className="owner-onboarding-grid">
          <OwnerOnboardingSidebar L={L} />

          <div className="owner-form-card">
            <header className="border-b border-white/10 pb-5">
              <h2 className="text-xl font-bold text-white sm:text-2xl">{L.formTitle}</h2>
              <p className="mt-2 text-sm text-slate-400">{L.formSubtitle}</p>
            </header>

            {mobileWizard ? (
              <>
                <div className="owner-wizard-steps mt-5" role="tablist" aria-label="Application steps">
                  {wizardLabels.map((label, i) => (
                    <span key={label} className={`owner-wizard-pill ${i === wizardStep ? "is-active" : i < wizardStep ? "is-done" : ""}`}>
                      {i + 1}. {label}
                    </span>
                  ))}
                </div>
                <div className="mt-6">{mobileStepContent}</div>
              </>
            ) : (
              <div className="mt-6 space-y-8">{desktopForm}</div>
            )}

            {formError ? (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
                {formError}
              </div>
            ) : null}

            {mobileWizard ? (
              <div className="owner-wizard-actions mt-6">
                {wizardStep > 0 ? (
                  <button type="button" onClick={prevStep} className="owner-btn-secondary min-h-[48px] flex-1">
                    {L.btnBack}
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
                {wizardStep < 3 ? (
                  <button type="button" onClick={nextStep} className="owner-onboarding-submit min-h-[48px] flex-1">
                    {L.btnNext}
                  </button>
                ) : (
                  <button type="button" disabled={loading} onClick={() => void submit()} className="owner-onboarding-submit min-h-[48px] flex-1">
                    {loading ? L.btnSending : L.btnSubmit}
                  </button>
                )}
              </div>
            ) : (
              <button type="button" disabled={loading} onClick={() => void submit()} className="owner-onboarding-submit mt-8 w-full min-h-[52px]">
                {loading ? L.btnSending : L.btnSubmit}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
