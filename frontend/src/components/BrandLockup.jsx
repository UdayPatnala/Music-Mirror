const BRAND_MARK_URL = `${process.env.PUBLIC_URL}/music-mirror-mark.svg`;

export default function BrandLockup({ label, labelClassName = "" }) {
  return (
    <div className="brand-lockup">
      <img
        alt="Music Mirror logo"
        className="brand-mark"
        height="72"
        src={BRAND_MARK_URL}
        width="72"
      />

      <div className="brand-copy">
        <p className={labelClassName}>{label}</p>
        <h1>Music Mirror</h1>
      </div>
    </div>
  );
}
