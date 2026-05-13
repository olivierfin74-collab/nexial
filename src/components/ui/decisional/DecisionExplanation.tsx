import type { DecisionExplanationPayload } from '@/types/decision'

interface DecisionExplanationProps {
  explanation: DecisionExplanationPayload
}

export function DecisionExplanation({ explanation }: DecisionExplanationProps) {
  return (
    <div className="flex flex-col gap-1">
      <p
        style={{
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 14,
          lineHeight: 1.45,
          color: 'var(--ink-primary)',
          margin: 0,
        }}
      >
        {explanation.summary}
      </p>
      {explanation.detail ? (
        <p
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            lineHeight: 1.4,
            color: 'var(--ink-secondary)',
            margin: 0,
          }}
        >
          {explanation.detail}
        </p>
      ) : null}
    </div>
  )
}
