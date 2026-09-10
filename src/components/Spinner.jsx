export default function Spinner({ label }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" role="status" aria-label={label || "Chargement"} />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );
}
