import React from "react";
import "./LeadForm.css";

export default function LeadForm({
  visible,
  fields,
  onFieldChange,
  onSubmitText,
  onSave,
  saving = false,
  activeField,
  onClose,
}) {
  if (!visible) return null;

  const hasRequiredFields = fields.name && fields.phone && fields.email;
  const filledCount =
    (fields.name ? 1 : 0) +
    (fields.company ? 1 : 0) +
    (fields.designation ? 1 : 0) +
    (fields.phone ? 1 : 0) +
    (fields.email ? 1 : 0);
  const totalFields = 5;

  // 👇 NAYA: comma-separated multiple values ko split karke har ek ko validate karo
  const splitValues = (str) =>
    String(str || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[\d\s\-+().]{7,20}$/;

  const emailParts = splitValues(fields.email);
  const phoneParts = splitValues(fields.phone);

  const emailValid = emailParts.length === 0 || emailParts.every((e) => EMAIL_RE.test(e));
  const phoneValid = phoneParts.length === 0 || phoneParts.every((p) => PHONE_RE.test(p));

  return (
    <div className="lead-form-overlay" id="lead-form-overlay" role="dialog" aria-label="Lead information">
      <div className="lead-form glass">
        <div className="lead-form__header">
          <div className="lead-form__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="lead-form__title">Your Contact Details</h2>
          {onClose && (
            <button
              type="button"
              className="lead-form__close"
              onClick={onClose}
              aria-label="Close form"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
        <p className="lead-form__hint">
          {hasRequiredFields
            ? "Please review your details below. Use commas to add multiple phone numbers or emails."
            : "Fields update as you speak. Use commas to add multiple phone numbers or emails."}
        </p>

        <div className="lead-form__fields">
          {/* Name */}
          <label className={`lead-form__field ${activeField === "name" ? "lead-form__field--active" : ""} ${fields.name ? "lead-form__field--filled" : ""}`}>
            <span className="lead-form__label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Name
            </span>
            <input
              type="text"
              value={fields.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              placeholder="Your name"
              id="lead-field-name"
            />
            {fields.name && <span className="lead-form__check">✓</span>}
          </label>

          {/* Company */}
          <label className={`lead-form__field ${activeField === "company" ? "lead-form__field--active" : ""} ${fields.company ? "lead-form__field--filled" : ""}`}>
            <span className="lead-form__label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
                <path d="M9 9h1" />
                <path d="M9 13h1" />
                <path d="M9 17h1" />
              </svg>
              Company Name
            </span>
            <input
              type="text"
              value={fields.company || ""}
              onChange={(e) => onFieldChange("company", e.target.value)}
              placeholder="Company or organization"
              id="lead-field-company"
            />
            {fields.company && <span className="lead-form__check">✓</span>}
          </label>

          {/* Designation */}
          <label className={`lead-form__field ${activeField === "designation" ? "lead-form__field--active" : ""} ${fields.designation ? "lead-form__field--filled" : ""}`}>
            <span className="lead-form__label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Designation
            </span>
            <input
              type="text"
              value={fields.designation || ""}
              onChange={(e) => onFieldChange("designation", e.target.value)}
              placeholder="Job title or role"
              id="lead-field-designation"
            />
            {fields.designation && <span className="lead-form__check">✓</span>}
          </label>

          {/* Phone */}
          <label className={`lead-form__field ${activeField === "phone" ? "lead-form__field--active" : ""} ${fields.phone ? "lead-form__field--filled" : ""}`}>
            <span className="lead-form__label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              Phone Number(s)
            </span>
            <input
              type="text"
              value={fields.phone}
              onChange={(e) => onFieldChange("phone", e.target.value)}
              placeholder="Phone number(s), comma separated"
              id="lead-field-phone"
            />
            {fields.phone && (
              <span className={`lead-form__check ${!phoneValid ? "lead-form__check--error" : ""}`}>
                {phoneValid ? "✓" : "!"}
              </span>
            )}
          </label>

          {/* Email */}
          <label className={`lead-form__field ${activeField === "email" ? "lead-form__field--active" : ""} ${fields.email ? "lead-form__field--filled" : ""}`}>
            <span className="lead-form__label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email(s)
            </span>
            <input
              type="text"
              value={fields.email}
              onChange={(e) => onFieldChange("email", e.target.value)}
              placeholder="email(s), comma separated"
              id="lead-field-email"
            />
            {fields.email && (
              <span className={`lead-form__check ${!emailValid ? "lead-form__check--error" : ""}`}>
                {emailValid ? "✓" : "!"}
              </span>
            )}
          </label>
        </div>

        {/* Progress indicator */}
        <div className="lead-form__progress">
          <div className="lead-form__progress-bar">
            <div
              className="lead-form__progress-fill"
              style={{
                width: `${(filledCount / totalFields) * 100}%`,
              }}
            />
          </div>
          <span className="lead-form__progress-text">
            {filledCount} of {totalFields} fields collected
          </span>
        </div>

        {/* Validation hints */}
        {fields.email && !emailValid && (
          <p className="lead-form__validation-error">
            Please enter valid email address(es), separated by commas if more than one.
          </p>
        )}
        {fields.phone && !phoneValid && (
          <p className="lead-form__validation-error">
            Please enter valid phone number(s), separated by commas if more than one.
          </p>
        )}

        <form
          className="lead-form__text-fallback"
          onSubmit={(e) => {
            e.preventDefault();
            const text = e.target.elements.namedItem("fallback")?.value;
            if (text?.trim()) onSubmitText(text.trim());
            e.target.reset();
          }}
        >
          <input name="fallback" type="text" placeholder="Type correction or details…" />
          <button type="submit">Send</button>
        </form>

        <button
          type="button"
          className="lead-form__save"
          onClick={onSave}
          disabled={!hasRequiredFields || saving || !emailValid || !phoneValid}
          id="save-lead-btn"
        >
          {saving ? "Saving..." : "Save Details"}
        </button>
      </div>
    </div>
  );
}