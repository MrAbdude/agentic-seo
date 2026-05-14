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

  return {
    title,
    projectName,
    hasH1: $('h1').length > 0,
    headingCount: headings.length,
    headings,
    codeBlocks,
    tables,
    metaDescription: metaDescription || null,
    hasMetaDescription: !!metaDescription,
    plainText: text,
    wordCount: text.split(' ').length
  }
}