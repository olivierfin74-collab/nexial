import type { Explanation } from '@/types/decision'

interface DecisionExplanationProps {
  explanation: Explanation
}

export function DecisionExplanation({ explanation }: DecisionExplanationProps) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-editorial-sans)',
        fontSize: 14,
        lineHeight: 1.45,
        color: 'var(--ink-primary)',
        margin: 0,
      }}
    >
      {explanation.text_fr}
    </p>
  )
}
