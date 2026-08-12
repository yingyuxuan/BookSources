/**
 * 碧曲书库 书源
 * 站点：http://www.biqugere.net/
 * 实测（2026-08-10 站点已恢复）：
 *  - 搜索：GET /modules/article/search.php?searchkey=关键词，结果在 <table class="grid"> 表格中
 *  - 详情：og meta 齐全（status/update_time/latest_chapter_name/category）
 *  - 目录：详情页 <div id="list"> 内 <dl><dd><a href="/biquge/{bid}/{cid}" title="章名">，正序
 *  - 正文：<div class="content" id="booktext">，<br /> 分段
 * v103：搜索改用正则提取行（jsoup 对独立 <tr> 片段会丢弃，HTML.parse(row) 选择器失效）
 * v104：修复目录获取失败 — 页面有2个 id="list"，jsoup getElementById 只取第一个空div，
 *       改用属性选择器 div[id=list] 绕过 ID 快捷路径
 * v106：修复封面 — 新增 cover 字段到 detail 返回值，优先取 #fmimg img.attr('src')，
 *       回退 og:image meta.attr('content')
 */

const baseUrl = "http://www.biqugere.net"

var bookSource = JSON.stringify({
  name: "碧曲书库",
  url: "biqugere.net",
  version: 101
})

//搜索（GET searchkey，正则提取行，避免 jsoup 片段解析）
const search = (key) => {
  let response = GET(`${baseUrl}/modules/article/search.php?searchkey=${encodeURI(key)}`)
  let array = []
  // 用正则直接提取 <tr> 数据行（表头行含 <th> 自动跳过）
  let rows = response.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
  rows.forEach((row) => {
    let nameM = row.match(/<td[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!nameM) return
    let detail = nameM[1]
    let name = nameM[2].replace(/<[^>]+>/g, '').trim()
    if (!name) return
    if (detail && detail.indexOf('http') !== 0) detail = baseUrl + detail
    // 作者：第 3 个 td（书名/最新章节/作者/字数/更新/状态）
    let tds = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || []
    let author = tds.length >= 3 ? tds[2].replace(/<[^>]+>/g, '').trim() : ''
    array.push({
      name: name,
      author: author,
      cover: '',
      detail: detail
    })
  })
  return JSON.stringify(array)
}

//详情
const detail = (url) => {
  let $ = HTML.parse(GET(url))
  var cover = $('#fmimg img').attr('src') || $('meta[property="og:image"]').attr('content') || ''
  return JSON.stringify({
    summary: $('meta[property="og:description"]').attr('content'),
    status: $('meta[property="og:novel:status"]').attr('content'),
    category: $('meta[property="og:novel:category"]').attr('content'),
    words: '',
    update: $('meta[property="og:novel:update_time"]').attr('content'),
    lastChapter: $('meta[property="og:novel:latest_chapter_name"]').attr('content'),
    cover: cover,
    catalog: url
  })
}

//目录（详情页即完整目录，只取 #list 内 <dl> 的章节链接，正序无需反转）
// 注意：页面有2个 id="list"，jsoup 的 getElementById 只取第一个（空div），
// 必须用属性选择器 div[id=list] 避免 ID 快捷路径，正确匹配第二个含章节的 div
const catalog = (url) => {
  let $ = HTML.parse(GET(url))
  let items = $('div[id=list] dl dd a')
  if (typeof items === 'string') items = [items]
  let array = []
  items.forEach((item) => {
    let href = item.attr('href')
    if (href && href.indexOf('http') !== 0) href = baseUrl + href
    array.push({
      name: item.text(),
      url: href,
      vip: false
    })
  })
  return JSON.stringify(array)
}

//章节
const chapter = (url) => {
  let response = GET(url)
  let content = ''
  let match = response.match(/<div class="content" id="booktext">([\s\S]*?)<\/div>/)
  if (match) content = match[1]
  content = content.replace(/<br\s*\/?>/gi, '\n')
  content = content.replace(/&nbsp;/gi, ' ')
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '')
  content = content.replace(/<[^>]+>/g, '')
  content = content.replace(/.*(?:正在手打中|请稍等片刻|重新刷新页面|全文字更新|牢记网址|高速文字手打|章节列表|碧曲书库).*\n?/g, '')
  content = content.replace(/\n{3,}/g, '\n\n')
  return content.trim()
}

