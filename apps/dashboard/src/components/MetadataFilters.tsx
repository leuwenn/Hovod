import { useState } from 'react';
import { useT } from '../lib/i18n/index.js';

export interface MetadataFilter {
  key: string;
  value: string;
}

/**
 * Key/value custom-metadata filter chips + add form (exact match, server-side).
 * A repeated key replaces its previous value (same behavior as the metadata editor).
 */
export function MetadataFilters({
  filters,
  onChange,
}: {
  filters: MetadataFilter[];
  onChange: (filters: MetadataFilter[]) => void;
}) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const { t } = useT();

  const add = () => {
    const k = key.trim();
    const v = value.trim();
    if (!k || !v) return;
    onChange([...filters.filter((f) => f.key !== k), { key: k, value: v }]);
    setKey('');
    setValue('');
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium font-mono bg-accent-600/10 text-accent-400 border border-accent-600/20"
        >
          {f.key}={f.value}
          <button
            type="button"
            onClick={() => onChange(filters.filter((x) => x.key !== f.key))}
            title={t.common.remove}
            aria-label={`${t.common.remove} ${f.key}`}
            className="hover:text-accent-200 cursor-pointer"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </span>
      ))}

      <form
        onSubmit={(e) => { e.preventDefault(); add(); }}
        className="flex items-center gap-1.5"
      >
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={t.videoDetail.metadataKey}
          maxLength={255}
          aria-label={t.videoDetail.metadataKey}
          className="h-7 w-24 px-2 text-[11px] rounded bg-zinc-900/60 border border-zinc-800 text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.videoDetail.metadataValue}
          maxLength={255}
          aria-label={t.videoDetail.metadataValue}
          className="h-7 w-28 px-2 text-[11px] rounded bg-zinc-900/60 border border-zinc-800 text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-700 transition-colors"
        />
        <button
          type="submit"
          disabled={!key.trim() || !value.trim()}
          className="h-7 px-2.5 text-[11px] font-medium rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          {t.videos.addFilter}
        </button>
      </form>
    </div>
  );
}
