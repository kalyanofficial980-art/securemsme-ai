type PricingCardProps = {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

export function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
}: PricingCardProps) {
  return (
    <div
      className={`rounded-3xl border p-6 shadow-sm ${
        highlighted
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-950"
      }`}
    >
      <h3 className="text-xl font-bold">{name}</h3>
      <p
        className={`mt-2 text-sm ${highlighted ? "text-slate-300" : "text-slate-600"}`}
      >
        {description}
      </p>

      <div className="mt-6 text-4xl font-black">{price}</div>

      <ul className="mt-6 space-y-3 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span>✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        className={`mt-8 w-full rounded-full px-4 py-3 text-sm font-bold ${
          highlighted
            ? "bg-white text-slate-950 hover:bg-slate-100"
            : "bg-slate-950 text-white hover:bg-slate-800"
        }`}
      >
        Choose plan
      </button>
    </div>
  );
}
