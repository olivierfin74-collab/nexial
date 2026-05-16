'use client'

import { useEffect, useMemo, useState } from 'react'

const MAX_ASSET_IDS = 200
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface UserAssetThesis {
  asset_id?: string | null
  conviction_level?: string | null
  thesis_md?: string | null
  context_fr?: string | null
  [key: string]: unknown
}

export type UserAssetThesisByAssetId = Record<string, UserAssetThesis>

export interface UseUserAssetThesisBulkInput {
  userId?: string
  assetIds: string[]
  enabled?: boolean
}

export interface UseUserAssetThesisBulkResult {
  thesesByAssetId: UserAssetThesisByAssetId
  isLoading: boolean
  isError: boolean
  error: Error | null
}

type ThesisBulkResponse = {
  theses?: unknown
  count?: unknown
  error?: unknown
}

const EMPTY_THESES_BY_ASSET_ID: UserAssetThesisByAssetId = Object.freeze({})

function normalizeAssetIds(assetIds: string[]): string[] {
  return Array.from(
    new Set(
      assetIds
        .map((id) => id.trim())
        .filter((id) => UUID_RE.test(id)),
    ),
  )
    .sort()
    .slice(0, MAX_ASSET_IDS)
}

function normalizeUserId(userId: string | undefined): string | undefined {
  const value = userId?.trim()
  if (!value) return undefined
  return UUID_RE.test(value) ? value : undefined
}

function normalizeTheses(value: unknown): UserAssetThesisByAssetId {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return EMPTY_THESES_BY_ASSET_ID
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, UserAssetThesis] =>
      UUID_RE.test(entry[0]) &&
      !!entry[1] &&
      typeof entry[1] === 'object' &&
      !Array.isArray(entry[1]),
  )

  if (entries.length === 0) return EMPTY_THESES_BY_ASSET_ID
  return Object.fromEntries(entries)
}

export function useUserAssetThesisBulk({
  userId,
  assetIds,
  enabled = true,
}: UseUserAssetThesisBulkInput): UseUserAssetThesisBulkResult {
  const safeUserId = useMemo(() => normalizeUserId(userId), [userId])
  const inputAssetIdsKey = assetIds.join('|')
  const safeAssetIds = useMemo(
    () => normalizeAssetIds(inputAssetIdsKey ? inputAssetIdsKey.split('|') : []),
    [inputAssetIdsKey],
  )
  const assetIdsKey = safeAssetIds.join('|')
  const shouldFetch = enabled && safeAssetIds.length > 0

  const [thesesByAssetId, setThesesByAssetId] = useState<UserAssetThesisByAssetId>(
    EMPTY_THESES_BY_ASSET_ID,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!shouldFetch) {
      setIsLoading(false)
      setError(null)
      setThesesByAssetId(EMPTY_THESES_BY_ASSET_ID)
      return
    }

    const ctrl = new AbortController()
    let cancelled = false

    setIsLoading(true)
    setError(null)

    async function load() {
      try {
        const body = safeUserId
          ? { userId: safeUserId, assetIds: safeAssetIds }
          : { assetIds: safeAssetIds }
        const res = await fetch('/api/mobile/user-asset-thesis-bulk', {
          method: 'POST',
          cache: 'no-store',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          throw new Error(`user_asset_thesis_bulk_${res.status}`)
        }

        const json = (await res.json()) as ThesisBulkResponse
        if (cancelled) return

        setThesesByAssetId(normalizeTheses(json.theses))
        setIsLoading(false)
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return
        setThesesByAssetId(EMPTY_THESES_BY_ASSET_ID)
        setError(err instanceof Error ? err : new Error('user_asset_thesis_bulk_failed'))
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [assetIdsKey, safeAssetIds, safeUserId, shouldFetch])

  return {
    thesesByAssetId,
    isLoading,
    isError: error !== null,
    error,
  }
}
