import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Asset } from '../lib/types.js';
import { api } from '../lib/api.js';
import { STATUS_CFG } from '../lib/helpers.js';
import { useT } from '../lib/i18n/index.js';
import { AssetCard } from '../components/AssetCard.js';
import { MetadataFilters, type MetadataFilter } from '../components/MetadataFilters.js';

const STATUS_FILTERS = ['created', 'uploaded', 'queued', 'processing', 'ready', 'error'] as const;
const SEARCH_DEBOUNCE_MS = 350;

export function VideosPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [metaFilters, setMetaFilters] = useState<MetadataFilter[]>([]);
  const { t } = useT();

  // Debounce the search input so each keystroke doesn't hit the API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const hasFilters = !!debouncedSearch || statuses.length > 0 || metaFilters.length > 0;

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ limit: '200' });
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (statuses.length) params.set('status', statuses.join(','));
    for (const f of metaFilters) params.set(`metadata.${f.key}`, f.value);
    try {
      const list = await api<Asset[]>(`/v1/assets?${params.toString()}`);
      setAssets(list);
    } catch { /* ignore polling errors */ }
  }, [debouncedSearch, statuses, metaFilters]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, [refresh]);

  const toggleStatus = (status: string) =>
    setStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);

  const clearFilters = () => {
    setSearch('');
    setStatuses([]);
    setMetaFilters([]);
  };

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">{t.videos.title}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t.videos.subtitle}</p>
        </div>
        <button
          onClick={() => navigate('/videos/new')}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t.videos.newVideo}
        </button>
      </div>

      {/* Assets header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          {t.videos.assets}
          <span className="text-xs font-medium text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
            {assets.length}
          </span>
        </h2>
        <input
          type="text"
          placeholder={t.videos.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t.videos.searchAssets}
          className="h-9 w-56 px-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent-500/60 transition-colors"
        />
      </div>

      {/* Filter bar: status chips + metadata filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((status) => {
            const active = statuses.includes(status);
            const c = STATUS_CFG[status];
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                  active
                    ? `${c.bg} ${c.text} border-transparent`
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
                {t.status[status]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <MetadataFilters filters={metaFilters} onChange={setMetaFilters} />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 cursor-pointer"
          >
            {t.videos.clearFilters}
          </button>
        )}
      </div>

      {/* Asset grid */}
      {assets.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="6" width="16" height="12" rx="2" />
              <path d="M9 3v3M15 3v3M10 12l2-2 2 2" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">{hasFilters ? t.videos.noResults : t.videos.noVideos}</p>
          {!hasFilters && <p className="text-xs text-zinc-600 mt-1">{t.videos.noVideosHint}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => navigate(`/videos/${asset.id}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
