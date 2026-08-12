/**
 * 练剑小说 书源（HTML版 v101）
 * 站点：http://m.lianjianxsw.com/（移动版，UTF-8）
 * 搜索：POST /search.html s=关键词 → .bookbox
 * 详情：GET /book/ID/ → .cover img / .name / .dd_box span
 * 目录：GET /chapters/ID/N.html → a[href*="/book/"] + 分页
 * 章节：GET /book/ID/xxx.html → qsbs.bb('base64') → DECODE → <p>分段
 */

var bookSource = JSON.stringify({ name: "练剑小说", url: "lianjianxsw.com", version: 101 })

const BASE = "http://m.lianjianxsw.com/"

// ── 搜索 ──
const search = (key) => {
  let html = POST(BASE + "/search.html", {
    data: "s=" + ENCODE(key),
    headers: ["Content-Type:application/x-www-form-urlencoded"]
  })
  let results = []
  let items = SELECT(html, ".bookbox")
  if (!items || items.length === 0) return JSON.stringify(results)
  if (typeof items === "string") items = [items]

  items.forEach((item) => {
    let $i = HTML.parse(item)
    let name = $i(".bookname a").text() || ""
    if (!name) return
    let href = $i(".bookname a").attr("href") || ""
    let author = $i(".author").text().replace("作者：", "").trim()
    results.push({
      name: name,
      author: author,
      cover: $i(".bookimg img").attr("src") || "",
      detail: href.indexOf("http") === 0 ? href : BASE + href
    })
  })
  return JSON.stringify(results)
}

// ── 详情 ──
const detail = (url) => {
  let html = GET(url)
  if (!html) return JSON.stringify(null)
  let $ = HTML.parse(html)

  // .dd_box span → [作者, 分类, 状态]
  let spans = $(".dd_box span")
  let author = "", category = "", status = ""
  if (spans && spans.length > 0) author = spans[0].text().replace("作者：", "").trim()
  if (spans && spans.length > 1) category = spans[1].text().replace("分类：", "").trim()
  if (spans && spans.length > 2) status = spans[2].text().replace("状态：", "").trim()

  let updateM = html.match(/更新\s*(\d{4}-\d{2}-\d{2}[^<]*)/)
  let lcM = html.match(/最新[：:]\s*<a[^>]*>([^<]+)</)
  let catalogUrl = $(".readlink .rr").attr("href") || url

  return JSON.stringify({
    name: $(".name").text() || "",
    author: author,
    cover: BASE + $(".cover img").attr("src") || "",
    category: category,
    status: status,
    update: updateM ? updateM[1].trim() : "",
    lastChapter: lcM ? lcM[1].trim() : "",
    summary: $(".book_about dd").text() || "",
    catalog: catalogUrl.indexOf("http") === 0 ? catalogUrl : BASE + catalogUrl
  })
}

// ── 目录 ──
const catalog = (url) => {
  let results = []
  let pageUrl = url
  for (let p = 0; p < 50; p++) {
    let html = GET(pageUrl)
    if (!html) break
    let links = SELECT(html, 'a[href*="/book/"]')
    if (links && links.length > 0) {
      if (typeof links === "string") links = [links]
      let added = false
      links.forEach((a) => {
        let href = a.attr("href") || ""
        let name = a.text() || ""
        if (!href || !name || name === "下一页" || name === "上一页") return
        results.push({
          name: name.trim(),
          url: href.indexOf("http") === 0 ? href : BASE + href,
          vip: false
        })
        added = true
      })
      if (!added) break
    }
    // 翻页
    let nextM = html.match(/href="(\/chapters\/\d+\/\d+\.html)">[^<]*下一页/)
    if (!nextM) break
    pageUrl = BASE + nextM[1]
  }
  return JSON.stringify(results)
}

// ── 章节 ──
const chapter = (url) => {
  let html = GET(url)
  if (!html) return ""
  let b64 = html.match(/qsbs\.bb\('([^']+)'\)/)
  if (!b64) return ""
  let content = DECODE(b64[1], "base64")
  content = content.replace(/<p>/g, "").replace(/<\/p>/g, "\n")
  content = content.replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "")
  return content.trim()
}
