import { searchIcon, searchInput } from "../ui";

export function SearchInput({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="relative block" aria-label="Search for a city">
      <svg className={searchIcon} viewBox="0 0 24 24" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <line x1="16" y1="16" x2="21" y2="21" />
      </svg>
      <input
        className={searchInput}
        value={value}
        placeholder="Search for a city"
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoComplete="off"
      />
    </label>
  );
}
