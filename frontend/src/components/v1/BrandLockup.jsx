const BRAND_MARK_URL = "/emotune-mark.svg";

export default function BrandLockup({ label, labelClassName = "" }) {
  return (
    <div className="brand-lockup">
      <img
        alt="Emotune logo"
        className="brand-mark"
        height="72"
        src={BRAND_MARK_URL}
        width="72"
      />

      <div className="brand-copy">
        <p className={labelClassName}>{label || "Facial Emotion-Based Music Recommendation System"}</p>
        <h1>Emotune</h1>
      </div>
    </div>
  );
}

