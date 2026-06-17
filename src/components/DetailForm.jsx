import React from "react";
import "./DetailForm.css";

const FIELD_CONFIG = [
  { key: "name", label: "Full Name", type: "text", placeholder: "Your full name", icon: "👤" },
  { key: "company", label: "Company Name", type: "text", placeholder: "Company or organization", icon: "🏢" },
  { key: "phone", label: "Phone Number", type: "tel", placeholder: "+92 300 1234567", icon: "📱" },
  { key: "email", label: "Email Address", type: "email", placeholder: "email@example.com", icon: "📧" },
];

export default function DetailForm({
  visible,
  fields,
  onFieldChange,
  onSubmitText,
  activeField,
  onScanCard,
}) {
  if (!visible) return null;

  const filledCount = FIELD_CONFIG.filter(
    (f) => fields[f.key] && fields[f.key].trim().length > 0
  ).length;
  const progress = (filledCount / FIELD_CONFIG.length) * 100;

  return (
    <div
      className="detail-form-overlay"
      id="detail-form-overlay"
      role="dialog"
      aria-label="User details collection"
    >
      <div className="detail-form glass">
        <div className="detail-form__header">
          <h2 className="detail-form__title">Your Details</h2>
          <p className="detail-form__hint">
            Fields update as you speak. You can also type or scan a visiting card.
          </p>
          {/* Progress bar */}
          <div className="detail-form__progress">
            <div
              className="detail-form__progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="detail-form__progress-label">
            {filledCount} of {FIELD_CONFIG.length} fields filled
          </span>
        </div>

        <div className="detail-form__fields">
          {FIELD_CONFIG.map((field) => (
            <label
              key={field.key}
              className={`detail-form__field ${
                activeField === field.key ? "detail-form__field--active" : ""
              } ${
                fields[field.key] && fields[field.key].trim()
                  ? "detail-form__field--filled"
                  : ""
              }`}
            >
              <span className="detail-form__field-header">
                <span className="detail-form__field-icon">{field.icon}</span>
                <span className="detail-form__field-label">{field.label}</span>
                {activeField === field.key && (
                  <span className="detail-form__listening-badge">
                    <span className="detail-form__listening-dot" />
                    Listening
                  </span>
                )}
              </span>
              <input
                type={field.type}
                value={fields[field.key] || ""}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="detail-form__input"
              />
            </label>
          ))}
        </div>

        <div className="detail-form__actions">
          {/* Scan Card Button */}
          {onScanCard && (
            <button
              type="button"
              className="detail-form__btn detail-form__btn--scan"
              onClick={onScanCard}
            >
              📇 Scan Visiting Card
            </button>
          )}

          {/* Text fallback for corrections */}
          <form
            className="detail-form__text-fallback"
            onSubmit={(e) => {
              e.preventDefault();
              const text = e.target.elements.namedItem("fallback")?.value;
              if (text?.trim()) onSubmitText(text.trim());
              e.target.reset();
            }}
          >
            <input
              name="fallback"
              type="text"
              placeholder="Type correction or details…"
              className="detail-form__fallback-input"
            />
            <button type="submit" className="detail-form__btn detail-form__btn--send">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
