import * as cheerio from 'cheerio'

export function analyzeHTML(html) {
  const $ = cheerio.load(html)

  const headings = []
  $('h1, h2, h3, h4').each((_, el) => {
    headings.push($(el).text().trim())
  })

  const text = $('body').text().replace(/\s+/g, ' ').trim()
  const codeBlocks = $('code, pre').length
  const tables = $('table').length
  const metaDescription = $('meta[name="description"]').attr('content')

  // WHY: extract page title so each page in
  // llms.txt has a proper human readable name
  // instead of just showing the raw URL
  const title = $('title').text().trim() ||
                $('h1').first().text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                ''

  // WHY: extract project name from title
  // "Getting Started | AEO Studio" → "AEO Studio"
  // most sites put project name after the | or -
  const projectName = title.includes('|')
    ? title.split('|').pop().trim()
    : title.includes('-')
    ? title.split('-').pop().trim()
    : title

  // WHY: first paragraph is the best plain-English summary
  // of what the page is about — used in AGENTS.md and skill.md
  // when meta description is missing
  const firstParagraph = $('p').first().text().trim().slice(0, 200) || ''

  // WHY: count internal links to understand how well
  // the site is connected — more links = better crawlability
  const internalLinks = $('a[href^="/"]').length

  // WHY: detect if site has a search box
  // signals good UX and navigability for agents
  const hasSearch = $('input[type="search"], input[placeholder*="search" i]').length > 0

  // WHY: detect API endpoint patterns in text
  // signals this is a developer/API documentation site
  const apiEndpoints = (text.match(/\/(api|v\d)\/[\w\-]+/g) || []).slice(0, 5)

  return {
    title,
    projectName,
    // WHY: use firstParagraph as fallback description
    // so files don't say "No description" when meta is missing
    metaDescription: metaDescription || firstParagraph || null,
    hasMetaDescription: !!metaDescription,
    hasH1: $('h1').length > 0,
    headingCount: headings.length,
    headings,
    codeBlocks,
    tables,
    internalLinks,
    hasSearch,
    apiEndpoints,
    plainText: text,
    wordCount: text.split(' ').length
  }
}
