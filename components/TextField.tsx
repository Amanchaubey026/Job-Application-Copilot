import { useId } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
};

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline
}: Props) {
  const autoId = useId();
  return (
    <div className="field">
      <label htmlFor={autoId}>{label}</label>
      {multiline ? (
        <textarea
          id={autoId}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={autoId}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
