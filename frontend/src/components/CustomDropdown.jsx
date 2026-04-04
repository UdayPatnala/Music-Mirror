import { useState, useRef, useEffect } from "react";

export default function CustomDropdown({
  label,
  options,
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="dropdown-wrapper" ref={ref}>
      <label className="dropdown-label">{label}</label>

      <div
        className={`dropdown-header ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        {value}
        <span className="dropdown-arrow">▾</span>
      </div>

      {open && (
        <div className="dropdown-list">
          {options.map((option) => (
            <div
              key={option}
              className={`dropdown-item ${
                option === value ? "selected" : ""
              }`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}