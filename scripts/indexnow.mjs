// IndexNow: Bing, Yandex, Seznam, Naver ve Yep'e "bu URL'ler yeni/güncellendi"
// bildirimi. Google IndexNow kullanmıyor (Google için Search Console'dan
// sitemap gönderilir). Hesap gerekmez; anahtar dosyası public/ altında.
//
// Kullanım (deploy bittikten SONRA, anahtar dosyası canlıdayken):
//   node scripts/indexnow.mjs              → sitemap'teki tüm URL'ler
//   node scripts/indexnow.mjs /ruya-tabirleri/uyku-felci-karabasan ...  → yalnızca verilenler

const HOST = 'www.lunosfer.com'
const KEY = 'e6f8cc51eb840b74258bbe6db47aa7f5'
const SITE = `https://${HOST}`

async function sitemapUrls() {
  const xml = await fetch(`${SITE}/sitemap.xml`).then((r) => {
    if (!r.ok) throw new Error(`sitemap ${r.status}`)
    return r.text()
  })
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

const args = process.argv.slice(2)
const urlList = args.length ? args.map((p) => (p.startsWith('http') ? p : SITE + p)) : await sitemapUrls()

const keyCheck = await fetch(`${SITE}/${KEY}.txt`).then((r) => r.text()).catch(() => '')
if (keyCheck.trim() !== KEY) {
  console.error(`Anahtar dosyası canlıda yok: ${SITE}/${KEY}.txt — önce deploy et.`)
  process.exit(1)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
})
console.log(`IndexNow: ${res.status} ${res.statusText} — ${urlList.length} URL`)
// 200/202 = alındı. 403 = anahtar doğrulanamadı, 422 = URL'ler host ile uyuşmuyor.
