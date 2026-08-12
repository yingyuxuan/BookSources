/**
 * 蚂蚁文学 — 搜索
 * @params {string} key
 * @returns {[{name, author, cover, detail}]}
 */
const search = (key) => {
    let response = POST("https://m.mayiwsk.com/s.php",{data: `search_key=${key}`})
    let $ = HTML.parse(response)
    let array = []
    $('p.sone').forEach((child) => {
        let $ = HTML.parse(child)
        let bid = $("a")[0].attr("href").replaceAll("/","").replace(/.+_/,"")
        array.push({
            name: $('a')[0].text(),
            author: $('.author').text(),
            cover: `https://m.mayiwsk.com/files/article/image/${parseInt(Number(bid) /1000)}/${bid}/${bid}s.jpg`,
            detail: `https://m.mayiwsk.com${$('a')[0].attr('href')}`
        })
    })
    return JSON.stringify(array)
}

/**
 * 蚂蚁文学 — 详情
 */
const detail = (url) => {
    let response = GET(url)
    let $ = HTML.parse(response)
    // 从 URL 提取 bid：/book_12345/ → 12345
    var bid = (url.match(/_(\d+)/) || [])[1] || ''
    return JSON.stringify({
        summary: ($('#inf')[0] || {text:function(){return ''}}).text().replace('简介： ',''),
        status: ($('.info_t3')[0] || {text:function(){return ''}}).text().replace('状态：',''),
        category: ($('.info_t2')[0] || {text:function(){return ''}}).text().replace('类别：',''),
        words: '',
        update: ($('.info_t5')[0] || {text:function(){return ''}}).text().replace('更新：',''),
        lastChapter: ($('.info_t6 > a')[0] || {text:function(){return ''}}).text(),
        cover: bid ? `https://m.mayiwsk.com/files/article/image/${parseInt(Number(bid)/1000)}/${bid}/${bid}s.jpg` : '',
        catalog: url.replace('m','www') + 'index.html'
    })
}

/**
 * 蚂蚁文学 — 目录
 * @params {string} url
 * @returns {[{name, url, vip}]}
 */
const catalog = (url) => {
    let response = GET(url)
    let $ = HTML.parse(response)
    let array = []
    $('dt:nth-of-type(2) ~ dd').forEach((chapter) => {
        let $ = HTML.parse(chapter)
        array.push({
            name: $("a").text(),
            url: `https://www.mayiwsk.com${$("a").attr("href")}`
        })
    })
    return JSON.stringify(array)
}

/**
 * 蚂蚁文学 — 章节
 * @params {string} url
 * @returns {string}
 */
const chapter = (url) => {
    let response = GET(url)
    let $ = HTML.parse(response)
    // 取 #content 的 HTML，用 String.prototype.remove 清理推广 div，返回纯文本
    return $("#content")[0].remove("div")
}

var bookSource = JSON.stringify({
    name: "蚂蚁文学",
    url: "mayiwsk.com",
    version: 101
})
