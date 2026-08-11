// 丹书铁券 移动端书源（厚墨阅读 JS 引擎）
// 域名：m.dstiejuan.com（原 www.dstiejuan.com 的移动版）
// 页面结构：2026-08-11 实际抓取 m.dstiejuan.com 校验
//   - 移动端首页用 ul.cover / ul.vlist 布局，与桌面端 .item 不同
//   - 搜索表单仍为 POST /so/，字段 searchtype=all、369koolearn=关键词
//     服务端可能对脚本客户端返回空壳（仅热门推荐），厚墨引擎提交应能取得结果
//   - 详情页 meta[og:...] 与桌面端一致，额外提供 .detail 区块备用字段
//   - 目录页章在 ul.read > li > a（非桌面端的 .readlist）
//   - 章节正文在 div.content > p，需剔除版权警告/VIP推广/站点推广
//   - 域名仅支持 HTTP（HTTPS 证书问题），使用 http://

const HOST = 'http://m.dstiejuan.com'
const UA = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

// 补全地址
function absUrl(u) {
  if (!u) return u
  if (u.startsWith('//')) return 'http:' + u
  if (u.startsWith('/')) return HOST + u
  if (!/^https?:\/\//i.test(u)) return HOST + '/' + u
  return u
}

// 取 meta[property=...] 的 content
function metaProp(html, prop) {
  return HTML.parse(html)('meta[property="' + prop + '"]').attr('content') || ''
}

// 搜索：POST /so/
// 注意：该站在无 JS 环境下服务端可能仅返回热门推荐模板，不包含实际搜索结果
// 原因已在 www 版分析文档中注明（脚本客户端限制）
// 如果 App 内厚墨引擎 POST 提交有效则正常工作，否则搜索将返回空
const search = (key) => {
  let url = HOST + '/so/'
  let data = 'searchtype=all&369koolearn=' + encodeURIComponent(key)
  let html = POST(url, {
    data: data,
    headers: ['User-Agent:' + UA, 'Referer:' + HOST + '/', 'Content-Type:application/x-www-form-urlencoded']
  })
  if (!html) return '[]'
  // 尝试提取搜索结果（热门推荐按钮 + 可能的实际搜索结果）
  let array = []
  // 方式1: 热门推荐按钮（格式 /数字/，有 title 属性）
  let btns = HTML.parse(html)('.layui-btn-container .layui-btn')
  if (typeof btns === 'string') btns = [btns]
  let seen = {}
  btns.forEach(function(btn) {
    let detail = btn.attr('href') || ''
    let name = btn.attr('title') || btn.text() || ''
    if (!detail || !name || seen[detail]) return
    if (!/^\/\d+\/?$/.test(detail)) return
    seen[detail] = true
    array.push({
      name: name,
      author: '',
      cover: '',
      detail: absUrl(detail)
    })
  })
  // 方式2: 如果搜索结果以 .list 或 .vlist 形式出现（JS 渲染后）
  if (array.length === 0) {
    let items = HTML.parse(html)('.vlist a, .list a')
    if (typeof items === 'string') items = [items]
    items.forEach(function(a) {
      let detail = a.attr('href') || ''
      let name = a.text() || ''
      if (!detail || !name || seen[detail]) return
      if (!/^\/\d+\/?$/.test(detail.replace(/\/mulu\.html$/, ''))) return
      seen[detail] = true
      array.push({
        name: name,
        author: '',
        cover: '',
        detail: absUrl(detail)
      })
    })
  }
  return JSON.stringify(array)
}

// 详情
const detail = (url) => {
  let html = GET(absUrl(url), { headers: ['User-Agent:' + UA] })
  if (!html) return '{}'
  let meta = function(prop) { return metaProp(html, prop) }
  // og meta 优先（与桌面端一致）
  let name = meta('og:novel:book_name') || meta('og:title') || ''
  let author = meta('og:novel:author') || ''
  let cover = meta('og:image') || ''
  let status = meta('og:novel:status') || ''
  let category = meta('og:novel:category') || ''
  // 更新时间从 meta 取值
  let updateRaw = meta('og:novel:update_time') || ''
  let update = updateRaw.replace('T', ' ')
  // 最新章（meta 优先，备用从 .detail .new a 取）
  let lastChapter = meta('og:novel:latest_chapter_name') || ''
  if (!lastChapter) {
    lastChapter = HTML.parse(html)('.detail .new a').text() || ''
  }
  // 简介（跳过版权警告段落）
  let introPs = HTML.parse(html)('.intro p')
  if (typeof introPs === 'string') introPs = [introPs]
  let summary = introPs
    .map(function(p) { return typeof p.text === 'function' ? p.text() : p.replace(/<[^>]+>/g, '') })
    .filter(function(t) {
      return !/侵犯了您的权益/.test(t) &&
             !/最新章节/.test(t) &&
             !/是一名出色的小说作者/.test(t) &&
             !/全文阅读推荐地址/.test(t)
    })
    .join('\n')
    .trim()
  // 字数与状态回退：og meta 为空时从 .detail 区块提取
  let words = ''
  if (!status || !words) {
    let spans = HTML.parse(html)('.detail .layui-bg-red, .detail .layui-btn')
    if (typeof spans === 'string') spans = [spans]
    spans.forEach(function(s) {
      let t = typeof s.text === 'function' ? s.text() : ''
      if (/万字/.test(t) && !words) words = t.trim()
      if (/已完结|连载中/.test(t) && !status) status = t.trim()
    })
  }
  // 类别（.detail 中第一个非状态标签）
  if (!category) {
    let catBtn = HTML.parse(html)('.detail .layui-btn-radius:not(.layui-btn-danger)')
    let t = typeof catBtn === 'object' && catBtn.text ? catBtn.text() : ''
    if (!/已完结|连载中|万字/.test(t)) category = t
  }
  // 书名
  if (!name) {
    name = HTML.parse(html)('.detail .name strong').text() || HTML.parse(html)('h1').text() || ''
  }
  // 目录地址（meta og:novel:read_url 优先）
  let catalog = meta('og:novel:read_url') || ''
  if (!catalog) {
    // 备用：从 .action a 取包含"目录"或"mulu"的链接
    let actions = HTML.parse(html)('.action a')
    if (typeof actions === 'string') actions = [actions]
    actions.forEach(function(a) {
      let href = a.attr('href') || ''
      if (/mulu/.test(href)) catalog = absUrl(href)
    })
  }
  if (!catalog) catalog = absUrl(url.replace(/\/$/, '') + '/mulu.html')
  let book = {
    name: name,
    author: author,
    cover: absUrl(cover),
    summary: summary,
    status: status,
    category: category,
    words: words,
    update: update,
    lastChapter: lastChapter,
    catalog: catalog
  }
  return JSON.stringify(book)
}

// 目录：移动端章在 ul.read > li > a，每页约 50 章
// 仅返回首页章节目录，完整目录需 App 端逐页加载
const catalog = (url) => {
  let html = GET(absUrl(url), { headers: ['User-Agent:' + UA] })
  if (!html) return '[]'
  let as = HTML.parse(html)('.read a')
  if (typeof as === 'string') as = [as]
  let array = []
  as.forEach(function(a) {
    let href = a.attr('href') || ''
    // 移动端章链接格式 /数字/数字.html
    if (!/\/\d+\/\d+\.html$/.test(href)) return
    let name = typeof a.text === 'function' ? a.text() : ''
    if (!name) return
    array.push({
      name: name,
      url: absUrl(href),
      vip: false
    })
  })
  return JSON.stringify(array)
}

// 章节：移动端正文在 div.content > p
// 需剔除：版权警告、VIP推广、"本章未完，请点击下一页"、"喜欢XX请大家收藏"、"更新速度全网最快"
const chapter = (url) => {
  let html = GET(absUrl(url), { headers: ['User-Agent:' + UA] })
  if (!html) return ''
  let ps = HTML.parse(html)('.content p')
  if (typeof ps === 'string') ps = [ps]
  if (!ps.length) {
    return (HTML.parse(html)('.content').text() || '').trim()
  }
  let text = ps
    .map(function(p) { return typeof p.text === 'function' ? p.text() : p.replace(/<[^>]+>/g, '') })
    .filter(function(t) {
      return !/侵犯了您的权益/.test(t) &&
             !/尊贵特权.*免广告/.test(t) &&
             !/请大家收藏/.test(t) &&
             !/更新速度全网最快/.test(t) &&
             !/本章未完.*请点击下一页/.test(t) &&
             !/请点击下一页继续阅读/.test(t) &&
             !/喜欢.*请大家收藏/.test(t) &&
             !/第[一二三四五六七八九十百千0-9]+章/.test(t) // 章节标题行（与 h1 重复）
    })
  return text.join('\n').trim()
}

// 个人（该站无需登录）
const profile = function() {
  return JSON.stringify({ basic: [], extra: [] })
}

// 排行榜（移动端排行榜为静态页面但结构不同于搜索页，返回空）
const rank = function(title, cat, page) {
  return JSON.stringify({ end: true, books: [] })
}

// 书架（该站未提供远程书架）
const bookshelf = function(page) {
  return JSON.stringify({ books: [] })
}

var bookSource = JSON.stringify({
  name: '丹书铁券(移动端)',
  url: 'm.dstiejuan.com',
  version: 100,
  author: 'www → m 域名迁移，选择器全面适配移动端结构'
})
