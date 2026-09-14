interface Props {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  dir?: 'ltr' | 'rtl';
  placeholder?: string;
}

export function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required,
  dir,
  placeholder,
}: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-blush-700">{label}</span>
      <input
        type={type}
        value={value}
        dir={dir}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl border border-gold-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
      />
    </label>
  );
}
