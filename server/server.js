import express from 'express'
import cors from 'cors'
import puppeteer from 'puppeteer'
import { analyzeHTML } from './engine/htmlParser.js'
import { countTokens, getTokenStatus } from './engine/tokenCounter.js'
import { calculateScore } from './engine/scorer.js'
import { generateLLMSTxt, generateAgentsMd, generateSkillMd } from './engine/fileGenerator.js'

const app = express()
app.use(cors())
app.use(express.json())

// ─────────────────────────────────────────
// WHY: Puppeteer fetches fully rendered page
// handles React/Vue/Next.js sites properly
// ─────────────────────────────────────────
async function fetchPage(url, browser) {
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    // WHY: extra 2 seconds for React to finish rendering
    await new Promise(r => setTimeout(r, 2000))
    
    const html = await page.content()
    const text = await page.evaluate(() => document.body.innerText)
    
    // WHY: extract all internal links from this page
    // so we know what other pages exist on this site
    const links = await page.evaluate((baseUrl) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'))
      return anchors
        .map(a => a.href)
        .filter(href => {
          try {
            const url = new URL(href)
            const base = new URL(baseUrl)
            // WHY: only keep links from same domain
            // ignore external links to other websites
            return url.hostname === base.hostname
          } catch { return false }
        })
    }, url)

    await page.close()
    return { html, text, links }

  } catch (err) {
    await page.close()
    // WHY: if one page fails, return empty
    // so rest of crawl continues normally
    return { html: '', text: '', links: [] }
  }
}

// ─────────────────────────────────────────
// WHY: crawl multiple pages of the site
// so llms.txt contains ALL pages not just 1
// ─────────────────────────────────────────
async function crawlSite(startUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  })

  try {
    const base = new URL(startUrl).origin
    // WHY: track visited pages so we don't
    // scan same page twice
    const visited = new Set()
    const toVisit = [startUrl]
    const pages = []

    while (toVisit.length > 0 && pages.length < 30) {
      const url = toVisit.shift()

      // WHY: skip if already visited
      if (visited.has(url)) continue
      visited.add(url)

      console.log(`Scanning: ${url}`)
      const { html, text, links } = await fetchPage(url, browser)

      if (!html) continue

      const htmlAnalysis = analyzeHTML(html)
      const tokenCount = countTokens(text)

      // WHY: store each page's data separately
      // so we can list them all in llms.txt
      pages.push({
        url,
        title: htmlAnalysis.title || url,
        description: htmlAnalysis.metaDescription || '',
        tokenCount,
        wordCount: htmlAnalysis.wordCount,
        headings: htmlAnalysis.headings,
        codeBlocks: htmlAnalysis.codeBlocks,
        hasH1: htmlAnalysis.hasH1,
      })

      // WHY: add new links to visit queue
      // but only if from same domain
      for (const link of links) {
        const cleanLink = link.split('#')[0].split('?')[0]
        // WHY: remove # anchors and ?query params
        // /about#team and /about are the same page
        if (!visited.has(cleanLink) && cleanLink.startsWith(base)) {
          toVisit.push(cleanLink)
        }
      }
    }

    // WHY: if more than 30 pages found
    // this is probably a large platform — stop
    if (pages.length >= 30) {
      return { 
        error: 'Too many pages detected. AEO Studio works best with project and documentation websites only.' 
      }
    }

    return { pages }

  } finally {
    // WHY: always close browser
    // even if something crashes above
    await browser.close()
  }
}

// ─────────────────────────────────────────
// AUDIT ROUTE
// ─────────────────────────────────────────
app.post('/audit', async (req, res) => {
  try {
    const { url, text } = req.body

    let pages = []
    let singleAnalysis = null

    if (url) {
      const result = await crawlSite(url)

      // WHY: return error if site too large
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error })
      }

      pages = result.pages
      // WHY: use first page (homepage) for main score
      singleAnalysis = pages[0]

    } else {
      // WHY: paste mode — analyze text directly
      // no crawling needed
      const html = `<body>${text}</body>`
      const htmlAnalysis = analyzeHTML(html)
      const tokenCount = countTokens(text)
      singleAnalysis = { ...htmlAnalysis, tokenCount }
      pages = [{ url: 'pasted-content', title: 'Pasted Content', tokenCount, ...htmlAnalysis }]
    }

    // Check for special AEO files
    let hasRobotsTxt = false
    let hasLLMSTxt = false
    let hasAgentsMd = false

    if (url) {
      const base = new URL(url).origin
      try { const r = await fetch(`${base}/robots.txt`); if (r.ok) hasRobotsTxt = true } catch {}
      try { const r = await fetch(`${base}/llms.txt`); if (r.ok) hasLLMSTxt = true } catch {}
      try { const r = await fetch(`${base}/AGENTS.md`); if (r.ok) hasAgentsMd = true } catch {}
    }

    const analysis = {
      ...singleAnalysis,
      tokenStatus: getTokenStatus(singleAnalysis.tokenCount),
      hasRobotsTxt,
      hasLLMSTxt,
      hasAgentsMd,
      totalPages: pages.length,
      // WHY: pass all pages to frontend
      // so Results page can show full site info
      allPages: pages
    }

    const result = calculateScore(analysis)
    res.json({ success: true, analysis, result })

  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─────────────────────────────────────────
// GENERATE ROUTE
// ─────────────────────────────────────────
app.post('/generate', (req, res) => {
  try {
    const { name, description, headings, tokenCount, wordCount, codeBlocks, allPages } = req.body

    const info = {
      name: name || 'My Project',
      description: description || 'No description provided',
      headings: headings || [],
      tokenCount: tokenCount || 0,
      wordCount: wordCount || 0,
      codeBlocks: codeBlocks || 0,
      // WHY: pass all pages so llms.txt
      // lists every page with real token counts
      pages: allPages || []
    }

    const files = {
      'llms.txt': generateLLMSTxt(info),
      'AGENTS.md': generateAgentsMd(info),
      'skill.md': generateSkillMd(info)
    }

    res.json({ success: true, files })

  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.listen(3001, () => {
  console.log('AEO Studio backend running on http://localhost:3001')
})