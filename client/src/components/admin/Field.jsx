export default function Field({ label, children }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs uppercase font-semibold tracking-wider text-secondary">{label}</span>
      {children}
    </label>
  );
}
