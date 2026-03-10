import { CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';

interface CertTypeSelectProps {
  value: number;
  onChange: (value: number) => void;
  allowedMask?: number;
}

export default function CertTypeSelect({ value, onChange, allowedMask }: CertTypeSelectProps) {
  const types = Object.entries(CERT_TYPE_LABELS)
    .filter(([key]) => {
      if (allowedMask === undefined) return true;
      return (allowedMask >> Number(key)) & 1;
    })
    .map(([key, label]) => ({
      value: Number(key),
      label,
      icon: CERT_TYPE_ICONS[Number(key)],
    }));

  return (
    <select
      className="input-full"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {types.map((t) => (
        <option key={t.value} value={t.value}>
          {t.icon} {t.label}
        </option>
      ))}
    </select>
  );
}
