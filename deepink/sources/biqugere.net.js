/**
 * 笔趣阁人 书源
 * 站点：http://www.biqugere.net/
 * 说明：与 biquge2345.com 同模板（笔趣阁系列）。搜索 POST /s.php；详情页即完整目录；章节正文在 <div id="txt">。
 * ⚠ 站点当前返回 502（2026-08-10 实测），选择器基于通用笔趣阁模板推断，站点恢复后若失效请反馈调整。
 */

const baseUrl = "http://www.biqugere.net"

//搜索
const search = (key) => {
  let response = POST(`${baseUrl}/s.php`, `s=${encodeURI(key)}`)
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
    array.push({
      name: name,
      author: $i('.zuo > a').text(),
      cover: '',
      detail: detail
    })
  })
  return JSON.stringify(array)
}

//详情
const detail = (url) => {
  let $ = HTML.parse(GET(url))
  let book = {
    summary: $('meta[property="og:description"]').attr('content'),
    status: $('meta[property="og:novel:status"]').attr('content'),
    category: $('meta[property="og:novel:category"]').attr('content'),
    words: '',
    update: $('meta[property="og:novel:update_time"]').attr('content'),
    lastChapter: $('meta[property="og:novel:latest_chapter_name"]').attr('content'),
    catalog: url
  }
  return JSON.stringify(book)
}

//目录（详情页即完整目录，只取带 title 的章节链接）
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
  // 站点目录若为倒序（最新章在前）则转正序
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
  content = content.replace(/.*(?:一秒记住|打\.劫|把脑子交出来|寄存处).*\n?/g, '')
  content = content.replace(/\n{3,}/g, '\n\n')
  return content.trim()
}

var bookSource = JSON.stringify({
  name: "笔趣阁人",
  url: "biqugere.net",
  version: 100
})
