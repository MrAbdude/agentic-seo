export function calculateScore(analysis) {
  let score = 0
  const findings = []

  // --- Discovery (25 pts) ---
  if (analysis.hasRobotsTxt) {
    score += 10
    findings.push({ type: 'success', category: 'Discovery', message: 'robots.txt found ✅' })
  } else {
    findings.push({ type: 'error', category: 'Discovery', message: 'robots.txt missing ❌' })
  }

  if (analysis.hasLLMSTxt) {
    score += 10
    findings.push({ type: 'success', category: 'Discovery', message: 'llms.txt found ✅' })
  } else {
    findings.push({ type: 'error', category: 'Discovery', message: 'llms.txt missing ❌' })
  }

  if (analysis.hasAgentsMd) {
    score += 5
    findings.push({ type: 'success', category: 'Discovery', message: 'AGENTS.md found ✅' })
  } else {
    findings.push({ type: 'error', category: 'Discovery', message: 'AGENTS.md missing ❌' })
  }

  // --- Content Structure (25 pts) ---
  if (analysis.hasH1) {
    score += 5
    findings.push({ type: 'success', category: 'Content', message: 'H1 heading found ✅' })
  } else {
    findings.push({ type: 'error', category: 'Content', message: 'No H1 heading found ❌' })
  }

  if (analysis.codeBlocks > 0) {
    score += 10
    findings.push({ type: 'success', category: 'Content', message: `${analysis.codeBlocks} code blocks found ✅` })
  } else {
    findings.push({ type: 'warning', category: 'Content', message: 'No code examples found ⚠️' })
  }

  if (analysis.headingCount > 2) {
    score += 10
    findings.push({ type: 'success', category: 'Content', message: 'Good heading structure ✅' })
  } else {
    findings.push({ type: 'warning', category: 'Content', message: 'Poor heading structure ⚠️' })
  }

  // --- Token Economics (25 pts) ---
  if (analysis.tokenCount < 25000) {
    score += 15
    findings.push({ type: 'success', category: 'Tokens', message: `${analysis.tokenCount} tokens — good size ✅` })
  } else {
    findings.push({ type: 'error', category: 'Tokens', message: `${analysis.tokenCount} tokens — too large ❌` })
  }

  if (analysis.hasMetaDescription) {
    score += 10
    findings.push({ type: 'success', category: 'Tokens', message: 'Meta description found ✅' })
  } else {
    findings.push({ type: 'warning', category: 'Tokens', message: 'No meta description ⚠️' })
  }

  // --- Grade ---
  const grade = score >= 90 ? 'A'
    : score >= 75 ? 'B'
    : score >= 60 ? 'C'
    : score >= 40 ? 'D' : 'F'

  return { score, grade, findings }
}