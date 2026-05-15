import { encode } from 'gpt-tokenizer'

export function countTokens(text) {
  if (!text) return 0
  return encode(text).length
}

export function getTokenStatus(count) {
  if (count < 10000) return { status: 'good', message: 'Perfect size for AI' }
  if (count < 25000) return { status: 'warning', message: 'Getting large, consider splitting' }
  return { status: 'error', message: 'Too large, AI will lose context' }
}