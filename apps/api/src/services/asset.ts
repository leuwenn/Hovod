import { eq, and, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { assets, METADATA_LIMITS, S3_PATHS } from '@hovod/db';
import { db } from '../db.js';
import { env } from '../env.js';
import { NotFoundError } from '../middleware/error-handler.js';

/** Validation for user-defined custom metadata (writes and filters alike) */
export const customMetadataSchema = z.record(
  z.string().min(1).max(METADATA_LIMITS.MAX_KEY_LENGTH),
  z.string().max(METADATA_LIMITS.MAX_VALUE_LENGTH),
).refine(
  (obj) => Object.keys(obj).length <= METADATA_LIMITS.MAX_KEYS,
  `Maximum ${METADATA_LIMITS.MAX_KEYS} metadata entries allowed`,
);

/** Extract ?metadata.<key>=<value> filters and validate them against write limits (≤10 keys, key ≤255, value ≤255) */
export function parseMetadataFilters(query: Record<string, string>): Record<string, string> {
  const metadataEntries: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('metadata.')) metadataEntries[key.slice('metadata.'.length)] = value;
  }
  return customMetadataSchema.parse(metadataEntries);
}

/** Exact-match Drizzle conditions on custom_metadata via JSON_CONTAINS (key compared literally, no JSON path) */
export function metadataFilterConditions(filters: Record<string, string>): SQL[] {
  return Object.entries(filters).map(
    ([key, value]) => sql`JSON_CONTAINS(${assets.customMetadata}, JSON_OBJECT(${key}, ${value}))`,
  );
}

/** Same filters for raw SQL queries — append the clause to WHERE, the params after the positional ones */
export function metadataFilterSql(filters: Record<string, string>, assetAlias = 'a'): { clause: string; params: string[] } {
  const clause = Object.entries(filters)
    .map(([key]) => ` AND JSON_CONTAINS(${assetAlias}.custom_metadata, JSON_OBJECT(?, ?))`)
    .join('');
  const params = Object.entries(filters).flat();
  return { clause, params };
}

/**
 * Find an asset by ID or throw NotFoundError.
 * When orgId is provided (cloud mode), also verifies the asset belongs to that org.
 */
export async function findAssetOrFail(id: string, orgId?: string) {
  const conditions: SQL[] = [eq(assets.id, id)];
  if (orgId) conditions.push(eq(assets.orgId, orgId));

  const [asset] = await db.select().from(assets).where(and(...conditions)).limit(1);
  if (!asset) throw new NotFoundError('Asset not found');
  return asset;
}

export function getThumbnailUrl(assetId: string, status: string, customThumbnailKey?: string | null): string | null {
  // Custom thumbnails use a unique, per-upload S3 key (custom-thumbnail-{token}.{ext}),
  // so the URL changes on every replacement — no extra cache-busting needed.
  if (customThumbnailKey) return `${env.S3_PUBLIC_BASE_URL}/${customThumbnailKey}`;
  if (status !== 'ready') return null;
  return `${env.S3_PUBLIC_BASE_URL}/${S3_PATHS.PLAYBACK_PREFIX}/${assetId}/${S3_PATHS.THUMBNAIL}`;
}

export function getPlaybackUrls(assetId: string, playbackId: string) {
  const baseUrl = `${env.S3_PUBLIC_BASE_URL}/${S3_PATHS.PLAYBACK_PREFIX}/${assetId}`;
  return {
    assetId,
    playbackId,
    manifestUrl: `${baseUrl}/${S3_PATHS.MASTER_PLAYLIST}`,
    thumbnailVttUrl: `${baseUrl}/${S3_PATHS.THUMBNAILS_VTT}`,
    playerUrl: `${env.DASHBOARD_URL}/embed/${playbackId}`,
  };
}

export function getSourceKey(assetId: string): string {
  return `${S3_PATHS.SOURCES_PREFIX}/${assetId}/input.mp4`;
}
