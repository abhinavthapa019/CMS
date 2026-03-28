export default function StatCard({ icon, label, value, tone = "primary" }) {
  const toneMap = {
    primary: "bg-primary-fixed text-primary",
    secondary: "bg-secondary-container text-on-secondary-container",
    tertiary: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    error: "bg-on-error text-error",
  };

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/10 space-y-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toneMap[tone] || toneMap.primary}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="font-label uppercase tracking-widest text-[10px] font-semibold text-secondary">{label}</p>
        <p className="text-2xl font-bold font-headline text-on-surface">{value}</p>
      </div>
    </div>
  );
}
