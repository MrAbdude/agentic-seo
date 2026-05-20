import express from 'express'
import cors from 'cors'
import multer from 'multer'
import AdmZip from 'adm-zip'
import { Octokit } from '@octokit/rest'
import puppeteer from 'puppeteer'
import { analyzeHTML } from './engine/htmlParser.js'
import { countTokens, getTokenStatus } from './engine/tokenCounter.js'
import { calculateScore } from './engine/scorer.js'
import { generateLLMSTxt, generateAgentsMd, generateSkillMd, generateLLMSFullTxt } from './engine/fileGenerator.js'

const app = express()
app.use(cors())
app.use(express.json())

const upload = multer({ storage: multer.memoryStorage() })

const IMPORTANT_EXTENSIONS = ['.md', '.txt', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.env.example']
const IGNORE_PATHS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'package-lock.json', 'yarn.lock']
const PRIORITY_FILES = ['README.md', 'readme.md', 'AGENTS.md', 'llms.txt', 'package.json', 'pyproject.toml', 'Makefile']

function buildPagesFromFiles(files) {
  const pages = []
  const sorted = files.sort((a, b) => {
    const aP = PRIORITY_FILES.includes(a.name) ? 0 : 1
    const bP = PRIORITY_FILES.includes(b.name) ? 0 : 1
    return aP - bP
  })
  for (const file of sorted) {
    if (!file.content) continue
    const tokenCount = countTokens(file.content)
    pages.push({
      url: file.path,
      title: file.name,
      description: extractFirstLine(file.content),
      tokenCount,
      wordCount: file.content.split(' ').length,
      headings: extractMarkdownHeadings(file.content),
      codeBlocks: (file.content.match(/```/g) || []).length / 2,
      hasH1: file.content.includes('# '),
      fullText: file.content.slice(0, 3000),
    })
  }
  return pages
}

function extractFirstLine(content) {
  const lines = content.split('\n').filter(l => l.trim())
  const first = lines[0] || ''
  return first.replace(/^#+\s*/, '').slice(0, 150)
}

function extractMarkdownHeadings(content) {
  const matches = content.match(/^#{1,4}\s+.+/gm) || []
  return matches.map(h => h.replace(/^#+\s*/, '').trim())
}

function shouldIncludeFile(filePath) {
  for (const ignore of IGNORE_PATHS) {
    if (filePath.includes(ignore)) return false
  }
  const ext = '.' + filePath.split('.').pop()
  return IMPORTANT_EXTENSIONS.includes(ext)
}

async function fetchPage(url, browser) {
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    const html = await page.content()
    const text = await page.evaluate(() => document.body.innerText)
    const links = await page.evaluate((baseUrl) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'))
      return anchors.map(a => a.href).filter(href => {
        try {
          const url = new URL(href)
          const base = new URL(baseUrl)
          return url.hostname === base.hostname
        } catch { return false }
      })
    }, url)
    await page.close()
    return { html, text, links }
  } catch (err) {
    await page.close()
    return { html: '', text: '', links: [] }
  }
}

async function crawlSite(startUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  })
  try {
    const base = new URL(startUrl).origin
    const visited = new Set()
    const toVisit = [startUrl]
    const pages = []
    while (toVisit.length > 0 && pages.length < 10) {
      const url = toVisit.shift()
      if (visited.has(url)) continue
      visited.add(url)
      console.log(`Scanning: ${url}`)
      const { html, text, links } = await fetchPage(url, browser)
      if (!html) continue
      const htmlAnalysis = analyzeHTML(html)
      const tokenCount = countTokens(text)
      pages.push({
        url,
        title: htmlAnalysis.title || url,
        description: htmlAnalysis.metaDescription || '',
        tokenCount,
        wordCount: htmlAnalysis.wordCount,
        headings: htmlAnalysis.headings,
        codeBlocks: htmlAnalysis.codeBlocks,
        hasH1: htmlAnalysis.hasH1,
        fullText: text.slice(0, 3000),
      })
      for (const link of links) {
        const cleanLink = link.split('#')[0].split('?')[0]
        if (!visited.has(cleanLink) && cleanLink.startsWith(base)) {
          toVisit.push(cleanLink)
        }
      }
    }
    if (pages.length >= 10) {
      return { error: 'Too many pages detected. AEO Studio works best with project and documentation websites only.' }
    }
    return { pages }
  } finally {
    await browser.close()
  }
}

function buildAnalysisAndScore(pages, extras = {}) {
  const singleAnalysis = pages[0]
  const totalTokenCount = pages.reduce((sum, p) => sum + (p.tokenCount || 0), 0)
  const totalWordCount = pages.reduce((sum, p) => sum + (p.wordCount || 0), 0)
  const totalCodeBlocks = pages.reduce((sum, p) => sum + (p.codeBlocks || 0), 0)
  const analysis = {
    ...singleAnalysis,
    tokenCount: totalTokenCount,
    wordCount: totalWordCount,
    codeBlocks: totalCodeBlocks,
    tokenStatus: getTokenStatus(totalTokenCount),
    hasRobotsTxt: false,
    hasLLMSTxt: false,
    hasAgentsMd: false,
    totalPages: pages.length,
    allPages: pages,
    ...extras
  }
  const result = calculateScore(analysis)
  return { analysis, result }
}

// ── AUDIT ROUTE — URL / Paste ──
app.post('/audit', async (req, res) => {
  try {
    const { url, text } = req.body
    let pages = []
    if (url) {
      const result = await crawlSite(url)
      if (result.error) return res.status(400).json({ success: false, error: result.error })
      pages = result.pages
      const base = new URL(url).origin
      let hasRobotsTxt = false, hasLLMSTxt = false, hasAgentsMd = false
      try { const r = await fetch(`${base}/robots.txt`); if (r.ok) hasRobotsTxt = true } catch {}
      try { const r = await fetch(`${base}/llms.txt`); if (r.ok) hasLLMSTxt = true } catch {}
      try { const r = await fetch(`${base}/AGENTS.md`); if (r.ok) hasAgentsMd = true } catch {}
      const { analysis, result: scoreResult } = buildAnalysisAndScore(pages, { hasRobotsTxt, hasLLMSTxt, hasAgentsMd })
      return res.json({ success: true, analysis, result: scoreResult })
    } else {
      const html = `<body>${text}</body>`
      const htmlAnalysis = analyzeHTML(html)
      const tokenCount = countTokens(text)
      pages = [{ url: 'pasted-content', title: 'Pasted Content', tokenCount, fullText: text.slice(0, 3000), ...htmlAnalysis }]
      const { analysis, result } = buildAnalysisAndScore(pages)
      return res.json({ success: true, analysis, result })
    }
  } catch (err) {
    console.error('AUDIT ERROR:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── AUDIT GITHUB ROUTE ──
app.post('/audit-github', async (req, res) => {
  try {
    const { githubUrl } = req.body
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) return res.status(400).json({ success: false, error: 'Invalid GitHub URL' })
    const owner = match[1]
    const repo = match[2].replace('.git', '')
    console.log(`Reading GitHub repo: ${owner}/${repo}`)
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || undefined })
    const { data: treeData } = await octokit.git.getTree({ owner, repo, tree_sha: 'HEAD', recursive: 'true' })
    const importantFiles = treeData.tree
      .filter(f => f.type === 'blob' && shouldIncludeFile(f.path))
      .slice(0, 30)
    console.log(`Found ${importantFiles.length} important files`)
    const files = []
    for (const file of importantFiles) {
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: file.path })
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        files.push({ path: file.path, name: file.path.split('/').pop(), content: content.slice(0, 5000) })
      } catch { continue }
    }
    const pages = buildPagesFromFiles(files)
    if (pages.length === 0) return res.status(400).json({ success: false, error: 'No readable files found in repo' })
    const filePaths = files.map(f => f.path)
    const hasLLMSTxt = filePaths.some(p => p.includes('llms.txt'))
    const hasAgentsMd = filePaths.some(p => p.includes('AGENTS.md'))
    const { analysis, result } = buildAnalysisAndScore(pages, { hasLLMSTxt, hasAgentsMd, hasRobotsTxt: false, projectName: repo, title: repo })
    res.json({ success: true, analysis, result })
  } catch (err) {
    console.error('GITHUB AUDIT ERROR:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── AUDIT ZIP ROUTE ──
app.post('/audit-zip', upload.single('zip'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No ZIP file uploaded' })
    console.log(`Reading ZIP: ${req.file.originalname}`)
    const zip = new AdmZip(req.file.buffer)
    const entries = zip.getEntries()
    const files = []
    for (const entry of entries) {
      if (entry.isDirectory) continue
      if (!shouldIncludeFile(entry.entryName)) continue
      try {
        const content = entry.getData().toString('utf-8')
        files.push({ path: entry.entryName, name: entry.name, content: content.slice(0, 5000) })
      } catch { continue }
      if (files.length >= 30) break
    }
    const pages = buildPagesFromFiles(files)
    if (pages.length === 0) return res.status(400).json({ success: false, error: 'No readable files found in ZIP' })
    const filePaths = files.map(f => f.path)
    const hasLLMSTxt = filePaths.some(p => p.includes('llms.txt'))
    const hasAgentsMd = filePaths.some(p => p.includes('AGENTS.md'))
    const projectName = req.file.originalname.replace('.zip', '')
    const { analysis, result } = buildAnalysisAndScore(pages, { hasLLMSTxt, hasAgentsMd, hasRobotsTxt: false, projectName, title: projectName })
    res.json({ success: true, analysis, result })
  } catch (err) {
    console.error('ZIP AUDIT ERROR:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── GENERATE ROUTE ──
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
      pages: allPages || []
    }
    const files = {
      'llms.txt': generateLLMSTxt(info),
      'AGENTS.md': generateAgentsMd(info),
      'skill.md': generateSkillMd(info),
      'llms-full.txt': generateLLMSFullTxt(info)
    }
    res.json({ success: true, files })
  } catch (err) {
    console.error('GENERATE ERROR:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

app.listen(3001, () => {
  console.log('AEO Studio backend running on http://localhost:3001')
})
