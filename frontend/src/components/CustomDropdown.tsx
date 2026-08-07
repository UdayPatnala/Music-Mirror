import { useState, useRef, useEffect, useId } from "react";

interface CustomDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function CustomDropdown({
  label,
  options,
  value,
  onChange,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="dropdown-wrapper" ref={ref}>
      <label className="dropdown-label" id={labelId}>{label}</label>

      <div
        className={`dropdown-header ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
      >
        {value}
        <span className="dropdown-arrow" aria-hidden="true">▾</span>
      </div>

      {open && (
        <div className="dropdown-list" role="listbox" aria-labelledby={labelId}>
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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(option);
                  setOpen(false);
                }
              }}
              role="option"
              tabIndex={0}
              aria-selected={option === value}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
