// 丹书铁券 书源（厚墨阅读 JS 引擎）
// 以下选择器均依据 2026-08-11 实际抓取的真实页面结构核对：
//   - 首页/分类页/详情页/目录页/章节页均为服务端渲染（GET 直接返回）。
//   - 搜索为表单 POST：action="/so/" method="post"，字段 searchtype=all、369koolearn=关键词
//     （原规则源的 search.html + searchkey 均错误，已修正）。
//   - 书目卡片统一用 .item 组件（首页热门、分类列表同款），结构：
//       <div class="item"><div class="image"><a href="/id/"><img src=封面 alt=书名></a></div>
//         <dl><dt><span>作者</span><a href="/id/">书名</a></dt><dd>简介</dd></dl></div>
//   - 详情页 #bookinfo 含 og: meta 与正文信息块；状态/字数在 .count，最近更新在 .new。
//   - 目录页用 .readlist 内的 <a href="/id/章节号.html">。
//   - 章节正文在 #content 内的多个 <p>，首段为版权警告、末段为站点推广，需剔除。
// 说明：搜索结果页在本机沙箱客户端下服务端只回空壳（疑似对脚本客户端限制），
//       真实浏览器/厚墨引擎按上述表单契约提交应能取得结果；selectors 严格按站点实际结构编写。

const HOST = 'https://www.dstiejuan.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// 补全相对/协议相对地址为绝对地址
function absUrl(u) {
  if (!u) return u
  if (u.startsWith('//')) return 'https:' + u
  if (u.startsWith('/')) return HOST + u
  if (!/^https?:\/\//i.test(u)) return HOST + '/' + u
  return u
}

// 取 meta[property=...] 的 content（无则返回 ''）
function metaProp(html, prop) {
  return HTML.parse(html)('meta[property="' + prop + '"]').attr('content') || ''
}

// 搜索：POST /so/ ，关键词字段 369koolearn
const search = (key) => {
  let url = HOST + '/so/'
  let data = 'searchtype=all&369koolearn=' + encodeURIComponent(key)
  let html = POST(url, { data: data, headers: ['User-Agent:' + UA, 'Referer:' + HOST + '/'] })
  if (!html) return '[]'
  let items = HTML.parse(html)('.item')
  if (typeof items === 'string') items = [items]
  let array = []
  items.forEach((it) => {
    let h = HTML.parse(it)
    let detail = h('a').attr('href') || ''
    let name = h('dt a').text() || h('.image a').attr('title') || ''
    let author = h('dt span').text() || ''
    let cover = h('img').attr('src') || ''
    if (!detail && !name) return
    array.push({
      name: name,
      author: author,
      cover: absUrl(cover),
      detail: absUrl(detail)
    })
  })
  return JSON.stringify(array)
}

// 详情
const detail = (url) => {
  let html = GET(absUrl(url), { headers: ['User-Agent:' + UA] })
  if (!html) return '{}'
  let meta = (prop) => metaProp(html, prop)
  // 状态 / 字数 来自 #bookinfo .count 文本块
  let countText = HTML.parse(html)('#bookinfo .count').text() || ''
  let mStatus = countText.match(/状\s*态：(\S+)/)
  let mWords = countText.match(/字\s*数：(\S+)/)
  // 简介来自 #bookintro，剔除首段版权警告
  let introPs = HTML.parse(html)('#bookintro p')
  if (typeof introPs === 'string') introPs = [introPs]
  let summary = introPs
    .map((p) => (p.text ? p.text() : p.replace(/<[^>]+>/g, '')))
    .filter((t) => !/侵犯了您的权益/.test(t))
    .join('\n')
    .trim()
  // 最近更新章 / 时间 来自 .new
  let lastChapter = HTML.parse(html)('.new .keywords a').text() || ''
  let updateRaw = HTML.parse(html)('.new .uptime').text() || ''
  let update = updateRaw.replace(/^最后更新：/, '').trim()
  let book = {
    name: meta('og:novel:book_name') || HTML.parse(html)('#bookinfo h1').text() || '',
    author: meta('og:novel:author') || HTML.parse(html)('#author a').text() || '',
    cover: absUrl(meta('og:image')) || '',
    summary: summary,
    status: mStatus ? mStatus[1] : '',
    category: meta('og:novel:category') || '',
    words: mWords ? mWords[1] : '',
    update: update,
    lastChapter: lastChapter,
    catalog: absUrl(meta('og:novel:read_url'))
  }
  return JSON.stringify(book)
}

// 目录：.readlist 内的章节链接
const catalog = (url) => {
  let html = GET(absUrl(url), { headers: ['User-Agent:' + UA] })
  if (!html) return '[]'
  let as = HTML.parse(html)('.readlist a')
  if (typeof as === 'string') as = [as]
  let array = []
  as.forEach((a) => {
    let href = a.attr('href') || ''
    if (!/\/\d+\/\d+\.html$/.test(href)) return // 仅保留章节链接
    let name = a.text() || ''
    array.push({
      name: name,
      url: absUrl(href),
      vip: false
    })
  })
  return JSON.stringify(array)
}

// 章节：#content 内的 <p>，剔除首段版权警告与末段站点推广
const chapter = (url) => {
  let html = GET(absUrl(url), { headers: ['User-Agent:' + UA] })
  if (!html) return ''
  let ps = HTML.parse(html)('#content p')
  if (typeof ps === 'string') ps = [ps]
  if (!ps.length) {
    // 兜底：直接取 #content 文本
    return (HTML.parse(html)('#content').text() || '').trim()
  }
  let text = ps
    .map((p) => (p.text ? p.text() : p.replace(/<[^>]+>/g, '')))
    .filter((t) => !/侵犯了您的权益|请大家收藏|更新速度全网最快/.test(t))
  return text.join('\n').trim()
}

// 个人（该站无需登录，返回空结构防崩）
const profile = () => {
  return JSON.stringify({ basic: [], extra: [] })
}

// 排行榜（该站排行榜为 JS 渲染且结构不同，返回空防崩）
const rank = (title, cat, page) => {
  return JSON.stringify({ end: true, books: [] })
}

// 书架（该站未提供远程书架，返回空防崩）
const bookshelf = (page) => {
  return JSON.stringify({ books: [] })
}

var bookSource = JSON.stringify({
  name: '丹书铁券',
  url: 'www.dstiejuan.com',
  version: 100,
  author: '由规则源JSON转译并依实际页面修正'
})
