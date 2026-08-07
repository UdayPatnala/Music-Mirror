import { Link } from 'react-router-dom';

interface BrandLockupProps {
  label?: string;
  labelClassName?: string;
}

export default function BrandLockup({ label = "Music Mirror", labelClassName = "" }: BrandLockupProps) {
  return (
    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
      <img 
        src="/logo.jpg" 
        alt="Music Mirror Logo" 
        style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} 
      />
      <div>
        <span style={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0ea5e9, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Music Mirror
        </span>
        {label && <span className={labelClassName} style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7 }}>{label}</span>}
      </div>
    </Link>
  );
}
