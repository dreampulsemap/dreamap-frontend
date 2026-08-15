const fs = require('fs')
const path = require('path')

function walk(dir) {
  const res = []
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue
      res.push(...walk(full))
    } else if (/\.jsx?$|\.tsx?$/.test(entry)) {
      res.push(full)
    }
  }
  return res
}

const root = process.cwd()
const files = walk(root)
let problems = []

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8')
  if (/localStorage\s*\.(setItem|getItem)\s*\(.*admin/i.test(txt) || /localStorage\s*\.(setItem|getItem)\s*\(.*ADMIN_TOKEN/i.test(txt)) {
    problems.push(`${f}: contains localStorage usage with admin/ADMIN_TOKEN`)
  }
  // fetch to admin endpoints with Authorization header in same file
  if ((/fetch\([^\n]*\/api\/admin/i.test(txt) || /fetch\([^\n]*\/api\/admin\/dreams/i.test(txt)) && /Authorization\s*:/i.test(txt)) {
    problems.push(`${f}: calls /api/admin and contains Authorization header`) 
  }
}

if (problems.length) {
  console.error('ADMIN AUTH CHECK FAILED: found suspicious usages:')
  problems.forEach(p => console.error('- ' + p))
  process.exit(2)
}

console.log('ADMIN AUTH CHECK PASSED')
