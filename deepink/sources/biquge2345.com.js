/**
 * 笔趣阁2345 书源
 * 站点：https://www.biquge2345.com/
 * 说明：搜索为 POST /s.php；详情页即完整目录；章节正文在 <div id="txt"> 内，<br/> 分段
 */

const baseUrl = "https://www.biquge2345.com"

//搜索
const search = (key) => {
  let response = POST(`${baseUrl}/s.php`, `s=${encodeURI(key)}`)
  let $ = HTML.parse(response)
  let array = []
  $('.lastupdate ul > li').forEach((item) => {
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

//目录（详情页即完整目录，只取带 title 的章节链接，排除"开始阅读"按钮）
const catalog = (url) => {
  let $ = HTML.parse(GET(url))
  let array = []
  $('a[href*="/zhangjie/"][title]').forEach((item) => {
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
  content = content.replace(/.*(?:一秒记住|打\.劫|把脑子交出来|寄存处).*\n?/g, '')
  content = content.replace(/\n{3,}/g, '\n\n')
  return content.trim()
}

var bookSource = JSON.stringify({
  name: "笔趣阁2345",
  url: "biquge2345.com",
  version: 100
})
