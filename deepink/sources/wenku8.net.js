/**
 * 轻小说文库 书源
 * 站点：https://www.wenku8.net/
 * 编码：GBK ｜ 需登录
 * 目录：table.css 表格，td.vcss=卷，td.ccss=章节(a)
 * 章节：div#content 内含 ul#contentdp 来源声明，正文 br 分段
 * v101：添加 String.prototype.st 补丁 — QuickJS 引擎未注入此方法，
 *       但书源搜/详/目/章/排行全部依赖 .st(selector) 做子元素选择
 *       等价于 HTML.parse(this)(selector)
 */

const baseUrl = "https://www.wenku8.net"

// 引擎补丁：QuickJS 引擎未注入 String.prototype.st，
// 但书源所有函数都依赖 .st(selector) 做子元素查询。
// .st(selector) 等价于 HTML.parse(this)(selector)，通过 SELECT 返回子元素
String.prototype.st = function(query) { return HTML.parse(this)(query) }

var bookSource = JSON.stringify({
  name: "轻小说文库",
  url: "wenku8.net",
  version: 100,
  authorization: "https://www.wenku8.net/login.php",
  cookies: [".wenku8.net"],
  ranks: ranks
})

// ── 搜索 ──
const search = (key, page) => {
  let response = GET(`${baseUrl}/modules/article/search.php?searchtype=articlename&searchkey=${ENCODE(key, "gbk")}&page=${page + 1}`)
  let $ = HTML.parse(response)
  let array = []

  if ($("title").text() === `${key}搜索结果 - 轻小说文库`) {
    // 多结果页 — td > div 卡片
    let items = $("td > div")
    if (typeof items === "string") items = [items]
    items.forEach((child) => {
      let name = child.st("b > a").attr("title")
      if (!name) return
      let href = child.st("b > a").attr("href")
      if (href && href.indexOf("http") !== 0) href = baseUrl + href
      array.push({
        name: name,
        author: child.st("p:nth-child(2)").text().replace("作者:", "").replace(/\/分类:.+/, ""),
        cover: child.st("img").attr("src") || "",
        summary: child.st("p:nth-child(5)").text().replace("简介:", ""),
        status: child.st("p:nth-child(3)").text().replace(/更新:.+\//, ""),
        words: child.st("p:nth-child(3)").text().replace(/更新:.+\/字数:/, "").replace(/\/.+/, ""),
        category: child.st("p:nth-child(2)").text().replace(/作者:.+\/分类:/, ""),
        tags: child.st("p:nth-child(4)").text().replace("Tags:", "").split(" "),
        update: child.st("p:nth-child(3)").text().replace("更新:", "").replace(/\/字数:.+/, ""),
        detail: href
      })
    })
  } else {
    // 单结果（直接跳到详情页）
    let bidMatch = response.match(/article_id\s*=\s*"(\d+)"/)
    if (!bidMatch) return JSON.stringify(array)
    array.push({
      name: $("td > table > tbody > tr > td:nth-child(1) > span > b").text(),
      author: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)").text().replace("小说作者：", ""),
      cover: $("td > img").attr("src") || "",
      summary: $("td > span:nth-child(13)").text(),
      status: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(3)").text().replace("文章状态：", ""),
      words: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(5)").text().replace("全文长度：", ""),
      category: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1)").text().replace("文库分类：", ""),
      tags: $("span.hottext:nth-child(1) > b:nth-child(1)").text().replace("作品Tags：", "").split(" "),
      update: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(4)").text().replace("最后更新：", ""),
      lastChapter: $("td > span:nth-child(8)").text(),
      detail: `${baseUrl}/book/${bidMatch[1]}.htm`
    })
  }
  return JSON.stringify(array)
}

// ── 详情 ──
const detail = (url) => {
  let $ = HTML.parse(GET(url))
  // 目录链接
  let catalogLink = $("fieldset > div > a").attr("href")
  if (!catalogLink) {
    let link = $('a[href*="/novel/"]:first-child')
    if (link) catalogLink = link.attr("href")
  }
  if (catalogLink && catalogLink.indexOf("http") !== 0) catalogLink = baseUrl + catalogLink

  // 最新章节
  let lastChapter = ""
  let lcLink = $("td > span:nth-child(8) > a")
  if (lcLink) lastChapter = lcLink.text()

  let book = {
    name: $("td > table > tbody > tr > td:nth-child(1) > span > b").text(),
    author: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)").text().replace("小说作者：", ""),
    cover: $("td > img").attr("src") || "",
    summary: $("td > span:nth-child(13)").text(),
    status: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(3)").text().replace("文章状态：", ""),
    words: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(5)").text().replace("全文长度：", ""),
    category: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1)").text().replace("文库分类：", ""),
    tags: $("span.hottext:nth-child(1) > b:nth-child(1)").text().replace("作品Tags：", "").split(" "),
    update: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(4)").text().replace("最后更新：", ""),
    lastChapter: lastChapter,
    catalog: catalogLink || url
  }
  return JSON.stringify(book)
}

// ── 目录 ──
const catalog = (url) => {
  let $ = HTML.parse(GET(url))
  let array = []
  // 限定 table.css 避免选中页面上其他 td
  let rows = $("table.css tr")
  if (typeof rows === "string") rows = [rows]
  rows.forEach((row) => {
    let cells = row.st("td")
    if (!cells) return
    if (typeof cells === "string") cells = [cells]
    // 取第一个 td 判断是卷(vcss)还是章节(ccss)
    let first = cells[0]
    let cls = first.st("td").attr("class")
    if (cls === "vcss") {
      array.push({ name: first.st("td").text(), volume: true })
      return
    }
    if (cls === "ccss") {
      cells.forEach((cell) => {
        let a = cell.st("td > a")
        if (!a) return
        array.push({
          name: a.text(),
          url: url.replace("index.htm", a.attr("href")),
          vip: false
        })
      })
    }
  })
  return JSON.stringify(array)
}

// ── 章节 ──
const chapter = (url) => {
  let response = GET(url)
  // 从原始响应提取 #content，处理 <br> 分段与 &nbsp; 缩进
  let content = ""
  let match = response.match(/<div id="content">([\s\S]*?)<\/div>/)
  if (match) content = match[1]
  // 删除来源声明 ul 和 script
  content = content.replace(/<ul[\s\S]*?<\/ul>/g, "")
  content = content.replace(/<script[\s\S]*?<\/script>/g, "")
  // br → 换行
  content = content.replace(/<br\s*\/?>/gi, "\n")
  // 删除剩余 HTML 标签
  content = content.replace(/<[^>]+>/g, "")
  // &nbsp; → 空格（去除首行缩进）
  content = content.replace(/&nbsp;/gi, " ")
  // 清理多余空行和行首空白
  content = content.replace(/\n{3,}/g, "\n\n")
  content = content.replace(/^[ \t]+/gm, "")
  return content.trim()
}

// ── 排行榜 ──
const rank = (title, cat, page) => {
  const sortMap = {
    "总排行榜": "allvisit",
    "总推荐榜": "allvote",
    "月排行榜": "monthvisit",
    "月推荐榜": "monthvote",
    "周排行榜": "weekvisit",
    "周推荐榜": "weekvote",
    "日排行榜": "dayvisit",
    "日推荐榜": "dayvote",
    "最新入库": "postdate",
    "最近更新": "lastupdate",
    "总收藏榜": "goodnum",
    "字数排行": "size",
    "动画化作品": "anime",
    "热门轻小说": "allvisit",
    "今日更新": "lastupdate",
    "新书一览": "postdate",
    "热度排名": "allvisit"
  }
  let sort = sortMap[title] || "allvisit"
  let pg = page ? `&page=${page + 1}` : ""
  let $ = HTML.parse(GET(`${baseUrl}/modules/article/toplist.php?sort=${sort}${pg}`))
  let items = $("td > div")
  if (typeof items === "string") items = [items]
  let array = []
  items.forEach((child) => {
    let name = child.st("b > a").attr("title")
    if (!name) return
    let href = child.st("b > a").attr("href")
    if (href && href.indexOf("http") !== 0) href = baseUrl + href
    array.push({
      name: name,
      author: child.st("p:nth-child(2)").text().replace("作者:", "").replace(/\/分类:.+/, ""),
      cover: child.st("img").attr("src") || "",
      detail: href
    })
  })
  let hasNext = $("a.ngroup") ? true : false
  return JSON.stringify({ end: !hasNext, books: array })
}
