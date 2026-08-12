/**
 * 笔趣阁2345 书源
 * 站点：https://www.xbiquge2345.com/（原 biquge2345，已迁移至 xbiquge2345）
 * 说明：搜索为 POST /s.php；详情页即完整目录；章节正文在 <div id="txt"> 内，<br/> 分段
 * 变更记录：2026-08-11 域名 biquge2345 → xbiquge2345；detail 补充页面兜底提取；v102 修复搜索 POST 需显式设置 Content-Type 头，否则 encodeURI 后服务器不解码
 */

const baseUrl = "https://www.xbiquge2345.com"

//搜索
const search = (key) => {
  // 必须显式设置 Content-Type，否则 POST(url, body) 不带该头，
  // 服务器收到 encodeURI 后的 %XX 编码会当字面量匹配，永远搜不到
  let response = POST(`${baseUrl}/s.php`, {
    data: `s=${encodeURI(key)}`,
    headers: ["Content-Type:application/x-www-form-urlencoded"]
  })
  let $ = HTML.parse(response)
  let items = $('.lastupdate ul > li')
  // SELECT 对单元素返回 String、多元素返回 Array，统一成数组
  if (typeof items === 'string') items = [items]
  let array = []
  items.forEach((item) => {
    let $i = HTML.parse(item)
    let name = $i('.name > a').text()
    if (!name) return
    let detail = $i('.name > a').attr('href')
    if (detail && detail.indexOf('http') !== 0) detail = baseUrl + detail
    // cover 从搜索结果无法获取，留空
    let cover = ''
    // 尝试从封面图片获取（部分站点 li 内含 img）
    let img = $i('img').attr('src')
    if (img) {
      if (img.indexOf('http') !== 0) img = baseUrl + img
      cover = img
    }
    array.push({
      name: name,
      author: $i('.zuo > a').text(),
      cover: cover,
      detail: detail
    })
  })
  return JSON.stringify(array)
}

//详情
const detail = (url) => {
  let $ = HTML.parse(GET(url))
  // 优先从 og:meta 取，站点已迁移到 xbiquge2345 后 meta 基本完备
  let summary = $('meta[property="og:description"]').attr('content') || ''
  let status = $('meta[property="og:novel:status"]').attr('content') || ''
  let category = $('meta[property="og:novel:category"]').attr('content') || ''
  let updateTime = $('meta[property="og:novel:update_time"]').attr('content') || ''
  let lastChapter = $('meta[property="og:novel:latest_chapter_name"]').attr('content') || ''
  // og:novel:latest_chapter_name 可能为空，从页面最新章节列表兜底
  if (!lastChapter) {
    let latestItems = $('.fen_3 li a')
    if (typeof latestItems === 'string') latestItems = [latestItems]
    if (latestItems.length > 0) {
      lastChapter = latestItems[0].text()
    }
  }
  let cover = $('meta[property="og:image"]').attr('content') || ''
  let book = {
    summary: summary.trim(),
    status: status,
    category: category,
    words: '',
    update: updateTime,
    lastChapter: lastChapter,
    cover: cover,
    catalog: url
  }
  return JSON.stringify(book)
}

//目录（详情页即完整目录，只取带 title 的章节链接，排除"开始阅读"按钮）
const catalog = (url) => {
  let $ = HTML.parse(GET(url))
  let items = $('a[href*="/zhangjie/"][title]')
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
  // 站点目录为倒序（最新章在前），转为正序（第1章在前）
  return JSON.stringify(array.reverse())
}

//章节
const chapter = (url) => {
  let response = GET(url)
  let content = ''
  let match = response.match(/<div id="txt">([\s\S]*?)<\/div>/)
  if (match) content = match[1]
  content = content.replace(/<br\s*\/?>/gi, '\n')
  content = content.replace(/&nbsp;/gi, ' ')
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '')
  content = content.replace(/<[^>]+>/g, '')
  // 清理广告行和站点提示语
  content = content.replace(/.*(?:一秒记住|打\.劫|把脑子交出来|寄存处).*\n?/g, '')
  content = content.replace(/\n{3,}/g, '\n\n')
  return content.trim()
}

var bookSource = JSON.stringify({
  name: "笔趣阁2345",
  url: "xbiquge2345.com",
  version: 102
})
