import { countTokens } from './tokenCounter.js'

export function generateLLMSTxt(info) {
  // WHY: if we have real pages from crawl
  // list them all with token counts
  // this is the core value of llms.txt
  const pagesList = info.pages && info.pages.length > 0
    ? info.pages.map(p =>
        `- [${p.title || p.url}](${p.url}): ${p.description || 'No description'}. ~${p.tokenCount} tokens.`
      ).join('\n')
    : info.headings.map(h =>
        `- [${h}](#${h.toLowerCase().replace(/\s+/g, '-')}): ${h} section. ~${countTokens(h)} tokens.`
      ).join('\n') || '- No pages detected'

  return `# ${info.name}

> ${info.description}

## Pages
${pagesList}

## About
- Total Pages: ${info.pages ? info.pages.length : 1}
- Total Tokens: ~${info.tokenCount}
- Word Count: ${info.wordCount}
- Code Examples: ${info.codeBlocks}
`
}

export function generateAgentsMd(info) {
  return `# AGENTS.md

## What is this project?
${info.description}

## Site Structure
${info.pages && info.pages.length > 0
    ? info.pages.map(p => `- ${p.title || p.url}: ${p.url}`).join('\n')
    : info.headings.map(h => `- ${h}`).join('\n') || '- See documentation'
}

## Content Summary
- Total pages: ${info.pages ? info.pages.length : 1}
- Total words: ${info.wordCount}
- Code blocks found: ${info.codeBlocks}
- Total tokens: ~${info.tokenCount}

## How to run it
\`\`\`bash
npm install
npm run dev
\`\`\`

## Important Rules
- Read the docs before making changes
- Check existing code structure first
`
}

export function generateSkillMd(info) {
  return `# skill.md

## Tool: ${info.name}

### What it does
${info.description}

### Key Sections
${info.pages && info.pages.length > 0
    ? info.pages.map(p => `- ${p.title || p.url}`).join('\n')
    : info.headings.map(h => `- ${h}`).join('\n') || '- See documentation'
}

### Token Budget
- Total content: ~${info.tokenCount} tokens
- Total pages: ${info.pages ? info.pages.length : 1}
- Recommended chunk size: ~2000 tokens

### Limitations
- Max recommended page size: 25,000 tokens
- Ensure markdown is available for best AI parsing
`
}