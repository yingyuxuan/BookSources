const search = (key, page) => {
    let response = GET(`https://www.wenku8.net/modules/article/search.php?searchtype=articlename&searchkey=${ENCODE(key, "gbk")}&page=${page + 1}`)
    let $ = HTML2.parse(response)
    let array = []
    if($("title").text() === `${key}搜索结果 - 轻小说文库`) {
        $('td > div').forEach((child) => {
            array.push({
                name: child.st('b > a').attr("title"),
                author: child.st('p:nth-child(2)').text().replace("作者:","").replace(/\/分类:.+/,""),
                cover: child.st('img').attr('src'),
                summary: child.st('p:nth-child(5)').text().replace("简介:",""),
                status: child.st('p:nth-child(3)').text().replace(/更新:.+\//,""),
                words: child.st('p:nth-child(3)').text().replace(/更新:.+\/字数:/,"").replace(/\/.+/,""),
                category: child.st('p:nth-child(2)').text().replace(/作者:.+\/分类:/,""),
                tags: child.st('p:nth-child(4)').text().replace("Tags:","").split(" "),
                update: child.st('p:nth-child(3)').text().replace("更新:","").replace(/\/字数:.+/,""),
                detail: `https://www.wenku8.net${child.st('b > a').attr('href')}`
            })
        })
    } else {
        array.push({
            name: $('td > table > tbody > tr > td:nth-child(1) > span > b').text(),
            author: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)").text().replace("小说作者：", ""),
            cover: $('td > img').attr('src'),
            summary: $('td > span:nth-child(13)').text(),
            status: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(3)").text().replace("文章状态：", ""),
            words: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(5)").text().replace("全文长度：", ""),
            category: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1)").text().replace("文库分类：", ""),
            tags: $("span.hottext:nth-child(1) > b:nth-child(1)").text().replace("作品Tags：","").split(" "),
            update: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(4)").text().replace("最后更新：", ""),
            lastChapter: $("td > span:nth-child(8)").text(),
            detail: `https://www.wenku8.net/book/${$('span:nth-child(2) > fieldset > div > a').attr('href').replace(/.+bid=/,"")}.htm`
        })
    }
    return JSON.stringify(array)
}

const detail = (url) => {
    let response = GET(url)
    let $ = HTML2.parse(response)
    let book = {
        name: $('td > table > tbody > tr > td:nth-child(1) > span > b').text(),
        author: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)").text().replace("小说作者：", ""),
        cover: $('td > img').attr('src'),
        summary: $('td > span:nth-child(13)').text(),
        status: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(3)").text().replace("文章状态：", ""),
        words: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(5)").text().replace("全文长度：", ""),
        category: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1)").text().replace("文库分类：", ""),
        tags: $("span.hottext:nth-child(1) > b:nth-child(1)").text().replace("作品Tags：","").split(" "),
        update: $("table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(4)").text().replace("最后更新：", ""),
        lastChapter: $("td > span:nth-child(8)").text(),
        catalog: `https://www.wenku8.net${$('span:nth-child(1) > fieldset > div > a').attr('href')}`
    }
    return JSON.stringify(book)
}

const catalog = (url) => {
    let response = GET(url)
    let $ = HTML2.parse(response)
    let array = []
    for(let chapter of $("td").toList()) {
        if(chapter.st("td").text() === "") {
            continue
        }
        if(chapter.st("td").attr("class") === "vcss") {
            array.push({
                name: chapter.st("td").text(),
                volume: true
            })
       } else array.push({
           name: chapter.st("td").text(),
           url: url.replace("index.htm", chapter.st("td > a").attr("href"))
       })
    }
    return JSON.stringify(array)
}

const chapter = (url) => {
    let response = GET(url)
    let $ = HTML.parse(response)
    return $("#content").remove("ul")
}

var bookSource = JSON.stringify({
    name: "轻小说文库",
    url: "wenku8.net",
    version: 100,
    authorization: "https://www.wenku8.net/login.php",
    cookies: [".wenku8.net"]
})
