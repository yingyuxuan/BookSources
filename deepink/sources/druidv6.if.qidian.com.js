/**
 * 起点中文网 书源（厚墨阅读 JS 引擎 / QuickJS）
 * 站点：https://www.qidian.com
 * 说明：
 *  - 搜索/详情/目录走 起点 argus 接口，需要 QDInfo/QDSign 签名（见 CPOST/CGET）；
 *  - 章节正文走 wxapp.qidian.com 接口，非 VIP 章节能直接取，VIP 章节点返回 403 提示去购买；
 *  - 个人/书架/排行榜 需要登录后的 Cookie（qidian.com 域）。
 *
 * 注意：本文件针对「厚墨阅读」引擎做了适配核对：
 *  - 引擎硬编码调用 search/detail/catalog/chapter/profile/rank，返回结构需与
 *    SearchResult / BookDetail / Chapter / Profile / PagingBooks 对应（已对齐）；
 *  - HTML.parse(html) 在厚墨里返回的是一个函数 (query)=>SELECT(...)，单元素返回字符串、
 *    多元素返回数组，.text()/.attr() 挂在 String/Array 原型上，用法与 阅读 基本一致；
 *  - 网络 GET/POST 的 options 键名为 data（请求体）与 headers（["K: V", ...] 数组）。
 */

require('crypto-js')

// 转换更新时间 时间戳
function timestampToTime(timestamp) {
  if (timestamp.toString().length == 13) var date = new Date(timestamp);
  else var date = new Date(timestamp * 1000);
  var Y = date.getFullYear() + '-';
  var M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
  var D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
  var h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
  var m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
  var s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
  return Y + M + D + h + m + s;
}

const qie = function (data) {
  let key = CryptoJS.enc.Utf8.parse('0821CAAD409B84020821CAAD')
  let iv = CryptoJS.enc.Base64.parse('AAAAAAAAAAA=')
  encrypted = CryptoJS.TripleDES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

const qse = function (data) {
  let key = CryptoJS.enc.Utf8.parse('{1dYgqE)h9,R)hKqEcv4]k[h')
  let iv = CryptoJS.enc.Utf8.parse('01234567')
  encrypted = CryptoJS.TripleDES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

function CPOST(url, data) {
  let str1 = decodeURI(data).split("&").sort(function (a, b) { return a.localeCompare(b); }).join("&").toLowerCase()
  let time = Math.round(new Date())
  let QDInfo = qie(`0|7.9.242|1080|2206|1000014|12|1|Mi 12|792|1000014|4|0|${time}|0|0|||||1`)
  let sign = CryptoJS.MD5(str1).toString()
  let QDSign = qse(`Rv1rPTnczce|${time}|0||1|7.9.242|0|${sign}|f189adc92b816b3e9da29ea304d4a7e4`)
  let headers = ["User-Agent:Mozilla/mobile QDReaderAndroid/7.9.242/792/1000014", `QDInfo:${QDInfo}`, `QDSign:${QDSign}`, `tstamp:${time}`]
  url = `https://druidv6.if.qidian.com/argus/api/${url}`
  let response = POST(url, { data, headers })
  let $ = JSON.parse(response)
  return $;
}

function CGET(url) {
  let a = url.split("?")
  let str1 = a[1].split("&").sort(function (a, b) { return a.localeCompare(b); }).join("&").toLowerCase()
  let time = Math.round(new Date())
  let QDInfo = qie(`0|7.9.242|1080|2206|1000014|12|1|Mi 12|792|1000014|4|0|${time}|0|0|||||1`)
  let sign = CryptoJS.MD5(str1).toString()
  let QDSign = qse(`Rv1rPTnczce|${time}|0||1|7.9.242|0|${sign}|f189adc92b816b3e9da29ea304d4a7e4`)
  let headers = ["User-Agent:Mozilla/mobile QDReaderAndroid/7.9.242/792/1000014", `QDInfo:${QDInfo}`, `QDSign:${QDSign}`, `tstamp:${time}`]
  url = `https://druidv6.if.qidian.com/argus/api${url}`
  let response = GET(url, { headers })
  let $ = JSON.parse(response)
  return $;
}

// 搜索
const search = (key) => {
  let res = CPOST("/v1/booksearch/searchbooks", `keywordType=3&siteId=1&keyword=${encodeURI(key)}&pageSize=20&pageIndex=1`).Data
  // 接口失效/签名丢失时 .Data 为空，优雅返回空列表而非崩溃
  if (!res) return "[]"
  let a = res.Books || []
  let b = res.CardPage.filter(function (item) {
    return item.SpecificCardType == "5"
  });
  let $ = a.concat(b)
  let array = []
  $.forEach((child) => {
    array.push({
      name: child.BookName || child.BookCard.BookName,
      author: child.AuthorName || child.BookCard.AuthorName,
      cover: `https://bookcover.yuewen.com/qdbimg/349573/${child.BookId || child.BookCard.BookId}/180`,
      detail: child.BookId || child.BookCard.BookId,
    })
  })
  return JSON.stringify(array)
}

// 详情
const detail = (url) => {
  let $ = CGET(`/v3/bookdetail/get?bookId=${url}&isOutBook=0`).Data
  if (!$) return "{}"
  $ = $.BaseBookInfo
  if (!$) return "{}"
  let book = {
    summary: $.Description,
    status: $.BookStatus,
    // 修复：部分书籍没有 BookUgcTag，直接 .map 会空指针，先做存在判断
    category: ($.BookUgcTag ? $.BookUgcTag.map((item) => { return item.TagName }).join(" ") : "") || $.SubCategoryName,
    words: $.WordsCnt,
    // 简化：有 VIP 更新时间用 VIP，否则用普通更新时间
    update: timestampToTime($.ChapterInfo.LastVipChapterUpdateTime != 0 ? $.ChapterInfo.LastVipChapterUpdateTime : $.ChapterInfo.LastChapterUpdateTime),
    lastChapter: $.ChapterInfo.LastVipUpdateChapterName || $.ChapterInfo.LastUpdateChapterName,
    catalog: $.BookId
  }
  return JSON.stringify(book)
}

// 目录
const catalog = (url) => {
  let $ = CGET(`/v3/chapterlist/chapterlist?bookId=${url}&timeStamp=0&requestSource=0&md5Signature=&extendchapterIds=`).Data
  if (!$) return "[]"
  let array = []
  $.Volumes.forEach((volume) => {
    array.push({ name: volume.VolumeName })
    $.Chapters.filter(chapter => chapter.Vc == volume.VolumeCode).filter(function (item) {
      return item.C != "-10000"
    }).forEach(chapter => {
      array.push({
        name: chapter.N,
        url: `bookId=${url}&chapterId=${chapter.C}`,
        vip: chapter.V == 1
      })
    })
  })
  return JSON.stringify(array)
}

// 章节
const chapter = (url) => {
  let response = GET(`https://wxapp.qidian.com/ajax/chapter/getInfo?${url}&salt=&token=&_csrfToken=${COOKIE("_csrfToken")}`)
  let $ = JSON.parse(response).data
  // 未购买返回 403 和自动订阅地址
  if ($.chapterInfo.vipStatus == 1 && $.chapterInfo.isBuy == 0) throw JSON.stringify({
    code: 403,
    message: `https://m.qidian.com/book/${$.bookInfo.bookId}/${$.chapterInfo.chapterId}.html`
  })
  return $.chapterInfo.content.trim()
}

// 个人
const profile = () => {
  let response = GET(`https://m.qidian.com/user`)
  let $ = HTML.parse(response)
  return JSON.stringify({
    basic: [
      {
        name: '账号',
        value: $("p.center-header-p").text(),
        url: 'https://m.qidian.com/user'
      },
      {
        name: '起点币',
        value: $('li.btn-group-cell:nth-child(3) > a > output').text(),
        url: "https://m.qidian.com/user/account"
      },
      {
        name: '月票',
        value: $('li.btn-group-cell:nth-child(1) > a > output').text(),
        url: 'https://m.qidian.com/user/ticket/month'
      },
      {
        name: '推荐票',
        value: $('li.btn-group-cell:nth-child(2) > a > output').text(),
        url: 'https://m.qidian.com/user/ticket/recomm'
      }
    ],
    extra: [
      {
        name: '书架',
        type: 'books',
        method: 'bookshelf'
      }
    ]
  })
}

// 书架
// 厚墨/阅读的远程书架会按页调用 bookshelf(page)（page 从 0 开始），这里返回「当页」数据，
// 由 app 自行翻页，避免书籍 >20 本时重复。若你的远程书架是「只调用一次、要一次性返回全部」，
// 请改用下方注释里的「一次性返回全部」版本。
const bookshelf = (page) => {
  page = page || 0
  let response = GET(`https://wxapp.qidian.com/ajax/bookShelf/list?pageNum=${page + 1}&pageSize=20&_csrfToken=${COOKIE("_csrfToken")}`)
  let $ = JSON.parse(response).data
  let books = []
  ($.booksInfo || []).forEach((child) => {
    books.push({
      name: child.bName,
      author: child.bAuth,
      cover: `https://bookcover.yuewen.com/qdbimg/349573/${child.bid}/150`,
      detail: child.bid
    })
  })
  return JSON.stringify({ books })
}

/*
// 书架（备选：一次性返回全部，适用于 app 只调用一次书架函数的情况）
const bookshelf = () => {
  let books = []
  let page = 1
  let maxPage = 1
  do {
    let response = GET(`https://wxapp.qidian.com/ajax/bookShelf/list?pageNum=${page}&pageSize=20&_csrfToken=${COOKIE("_csrfToken")}`)
    let $ = JSON.parse(response).data
    maxPage = $.pageInfo ? $.pageInfo.pageMax : 1
    ($.booksInfo || []).forEach((child) => {
      books.push({
        name: child.bName,
        author: child.bAuth,
        cover: `https://bookcover.yuewen.com/qdbimg/349573/${child.bid}/150`,
        detail: child.bid
      })
    })
    page++
  } while (page <= maxPage)
  return JSON.stringify({ books })
}
*/

// 排行榜
const rank = (title, category, page) => {
  let response = GET(`https://m.qidian.com/majax/rank/${title}?_csrfToken=${COOKIE('_csrfToken')}&gender=male&pageNum=${page + 1}&catId=${category}`)
  let $ = JSON.parse(response)
  let array = []
  $.data.records.forEach((child) => {
    array.push({
      name: child.bName,
      author: child.bAuth,
      cover: `https://bookcover.yuewen.com/qdbimg/349573/${child.bid}/150`,
      detail: child.bid
    })
  })
  return JSON.stringify({
    end: $.data.records.length == 0,
    books: array
  })
}

const ranks = [
  {
    title: {
      key: 'yuepiaolist',
      value: '月票榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'hotsaleslist',
      value: '畅销榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'readIndexlist',
      value: '阅读榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'newfanslist',
      value: '粉丝榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'reclist',
      value: '推荐榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'rewardlist',
      value: '打赏榜'
    },
    categories: []
  },
  {
    title: {
      key: 'updatelist',
      value: '更新榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'signlist',
      value: '签约榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'newbooklist',
      value: '新书榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  },
  {
    title: {
      key: 'newauthorlist',
      value: '新人榜'
    },
    categories: [
      { key: "-1", value: "全站" },
      { key: "21", value: "玄幻" },
      { key: "1", value: "奇幻" },
      { key: "2", value: "武侠" },
      { key: "22", value: "仙侠" },
      { key: "4", value: "都市" },
      { key: "15", value: "现实" },
      { key: "6", value: "军事" },
      { key: "5", value: "历史" },
      { key: "7", value: "游戏" },
      { key: "8", value: "体育" },
      { key: "9", value: "科幻" },
      { key: "10", value: "悬疑" },
      { key: "12", value: "轻小说" },
      { key: "20109", value: "诸天无限" }
    ]
  }
]

var bookSource = JSON.stringify({
  name: "起点中文网",
  url: "druidv6.if.qidian.com",
  version: 100,
  authorization: "https://passport.yuewen.com/yuewen.html?appid=13&areaid=31",
  cookies: [".qidian.com"],
  ranks: ranks
})
