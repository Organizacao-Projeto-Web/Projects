export { modules } from "../features/modulos/registry";
export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR").format(
      new Date(value.length === 10 ? `${value}T12:00:00` : value),
    )
    : "Não informada";
export function Logo() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 2v20M8 6h8M7 10h10M8 14h8M9 18h6" />
          <circle cx="12" cy="6" r="1.4" />
          <circle cx="12" cy="10" r="1.4" />
          <circle cx="12" cy="14" r="1.4" />
        </svg>
      </span>
      <span>
        <strong>
          Reab<span className="brand-dot">.</span>
        </strong>
        <small>GESTÃO DE FISIOTERAPIA</small>
      </span>
    </div>
  );
}
