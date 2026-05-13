// Render-only todo list card for fn_todo_list.
// Pure presentational. No fetch, no hook.

import type { TodoItem, TodoListPayload } from '@/types/nexial-v3'

interface TodoListCardProps {
  payload: TodoListPayload | null
  loading?: boolean
  error?: string | null
  onItemClick?: (item: TodoItem) => void
}

function severityTone(severity: string | undefined): string {
  switch (severity) {
    case 'critical':
      return 'var(--burgundy)'
    case 'warning':
      return '#8B6914'
    case 'info':
    default:
      return 'var(--forest-green)'
  }
}

export function TodoListCard({ payload, loading = false, error = null, onItemClick }: TodoListCardProps) {
  const items = payload?.items ?? []

  return (
    <section
      data-card="TodoListCard"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--ink-primary)',
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          À faire
        </h2>
        {payload?.total_count ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-tertiary)',
            }}
          >
            {payload.total_count}
          </span>
        ) : null}
      </header>

      {error ? (
        <p
          role="status"
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-secondary)',
          }}
        >
          Certaines données n’ont pas pu être mises à jour.
        </p>
      ) : loading || !payload ? (
        <p
          aria-busy="true"
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
          }}
        >
          Chargement…
        </p>
      ) : items.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
          }}
        >
          Aucune tâche pour le moment.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => (
            <li
              key={item.code}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              style={{
                padding: '8px 0',
                borderTop: '1px solid var(--border-subtle)',
                cursor: onItemClick ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: severityTone(item.severity),
                  marginTop: 7,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink-primary)',
                    lineHeight: 1.35,
                  }}
                >
                  {item.title_fr}
                </span>
                {item.subtitle_fr ? (
                  <span
                    style={{
                      fontFamily: 'var(--font-editorial-sans)',
                      fontSize: 11,
                      color: 'var(--ink-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.subtitle_fr}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
