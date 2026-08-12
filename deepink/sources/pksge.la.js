/**
 * 平凡文学 书源 (JSON → JS)
 * 站点：http://www.pksge.la/
 * 转换自：pksge.la.json
 * 
 * 搜索：GET /modules/article/search.php?searchkey=&searchtype=articlename
 * 详情/目录：同一页面，目录在 .zhangjiekaishi > ul > li
 * 正文：#booktext
 * 
 * v100：JSON 规则源转 JS，首次创建
 */

var bookSource = JSON.stringify({
  name: "平凡文学",
  url: "pksge.la",
  version: 100
})

const search = (key) => {
  var url = "http://www.pksge.la/modules/article/search.php?searchkey=" + encodeURI(key) + "&searchtype=articlename"
  var html = GET(url)
  var $ = HTML.parse(html)
  var list = $.query(".tutui")
  var array = []
  if (list && list.length > 0) {
    list.forEach(function(item) {
      var $item = HTML.parse(item)
      var nameEl = $item.query("h2 > a")
      if (!nameEl || nameEl.length === 0) return
      var name = nameEl.text()
      var detail = nameEl.attr("href")
      if (detail && detail.indexOf("http") !== 0) {
        detail = "http://www.pksge.la" + detail
      }
      // 作者：h3 文本，正则提取"作者："后的部分
      var authorEl = $item.query("h3")
      var author = ""
      if (authorEl && authorEl.length > 0) {
        var raw = authorEl.text()
        var m = raw.match(/作者：(.+)/)
        if (m) author = m[1].trim()
      }
      // 封面
      var coverEl = $item.query(".tutuiImg > a > img")
      var cover = ""
      if (coverEl && coverEl.length > 0) {
        cover = coverEl.attr("src")
        if (cover && cover.indexOf("http") !== 0) {
          cover = "http://www.pksge.la" + cover
        }
      }
      array.push({
        name: name,
        author: author,
        cover: cover,
        detail: detail
      })
    })
  }
  return JSON.stringify(array)
}

const detail = (url) => {
  var html = GET(url)
  var $ = HTML.parse(html)
  
  // 摘要
  var summary = ""
  var introEl = $.query("#intro")
  if (!introEl || introEl.length === 0) {
    introEl = $.query(".intro")
  }
  if (introEl && introEl.length > 0) {
    summary = introEl.text().trim()
  }
  
  // 状态：从页面提取
  var status = ""
  var statusEl = $.query("meta[property=og:novel:status]")
  if (statusEl && statusEl.length > 0) {
    status = statusEl.attr("content")
  }
  
  // 分类
  var category = ""
  var catEl = $.query("meta[property=og:novel:category]")
  if (catEl && catEl.length > 0) {
    category = catEl.attr("content")
  }
  
  // 封面
  var cover = ""
  var coverEl = $.query("meta[property=og:image]")
  if (coverEl && coverEl.length > 0) {
    cover = coverEl.attr("content")
  }
  
  // 最后章节名
  var lastChapter = ""
  var lcEl = $.query("meta[property=og:novel:latest_chapter_name]")
  if (lcEl && lcEl.length > 0) {
    lastChapter = lcEl.attr("content")
  }
  
  // 字数
  var words = ""
  
  // 更新时间
  var update = ""
  var upEl = $.query("meta[property=og:novel:update_time]")
  if (upEl && upEl.length > 0) {
    update = upEl.attr("content")
  }
  
  return JSON.stringify({
    summary: summary,
    status: status,
    category: category,
    words: words,
    update: update,
    lastChapter: lastChapter,
    catalog: url
  })
}

const catalog = (url) => {
  var html = GET(url)
  var $ = HTML.parse(html)
  var items = $.query(".zhangjiekaishi > ul > li")
  var array = []
  if (items && items.length > 0) {
    items.forEach(function(item) {
      var $item = HTML.parse(item)
      var aEl = $item.query("a")
      if (!aEl || aEl.length === 0) return
      var name = aEl.text()
      var url = aEl.attr("href")
      if (url && url.indexOf("http") !== 0) {
        url = "http://www.pksge.la" + url
      }
      array.push({
        name: name,
        url: url,
        vip: false
      })
    })
  }
  return JSON.stringify(array)
}

const chapter = (url) => {
  var html = GET(url)
  var $ = HTML.parse(html)
  var contentEl = $.query("#booktext")
  if (!contentEl || contentEl.length === 0) return ""
  var text = contentEl.text()
  // 净化：去除广告
  text = text.replace(/★★平凡文学★★[\s\S]+?请把本站网址推荐给您的朋友吧！/g, "")
  text = text.replace(/平凡文学提醒您：[\s\S]+?！/g, "")
  text = text.trim()
  return text
}

const profile = () => {
  return JSON.stringify({
    basic: [{name: "本站", value: bookSource, method: true}],
    extra: []
  })
}
