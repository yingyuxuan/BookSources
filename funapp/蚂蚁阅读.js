
//搜索
const search = (key, page) => {
  let response = Http2
  .url(`http://www.mayitxt.org/modules/article/search.php?q=${key}&searchtype=all`)
  .header("Content-Type", "application/x-www-form-urlencoded")
  .get()
  
  let array = []
  let $ = HTML2.parse(response.body.toString())
  
  $('div.BOX > table > tbody > tr:gt(0)').forEach((child) => {
    array.push({
      name: child.st('td:nth-child(3) > a').text(),
      author: child.st('td:nth-child(6) > span').text(),
    category: child.st('td:nth-child(2) > a').text().replace("[", "").replace("]", ""),
    lastChapter: child.st('td:nth-child(4) > a').text(),
    update: child.st('td:nth-child(5)').text(),
    status: child.st('td:nth-child(7)').text(),
    detail: child.st('td:nth-child(3) > a').attr("href"),
    })
  })
  
  return JSON.stringify(array)
}

//详情
const detail = (url) => {
  let response = GET(url)
  let $ = HTML.parse(response)
  let book = {
    name: $('#main_title > h1').text(),
    author: $('div.book_name > i > span').text(),
    summary: $('div.details > p').text(),
    cover: $('div.book_left > a > img').attr("src"),
    words: $('div.data_list > span:nth-child(2) > em').text().replace("字", ""),
    update: $('div.chapters > div > i').text(),
    lastChapter: $('div.chapters > div > a').text(),
    catalog: $('div.button_list > a:nth-child(3)').attr("href")
  }
  return JSON.stringify(book)
}

//目录
const catalog = (url) => {
  let response = GET(url)
  let $ = HTML.parse(response)
  let array = []
  $('div.mod.pattern-fill-container-mod.chapter-list.ar_modw > div > ul > li').forEach((booklet) => {
    let $ = HTML.parse(booklet)
    array.push({
      name: $('a').text(),
      url: $('a').attr('href'),
    })
  })
  return JSON.stringify(array)
}

//章节
const chapter = (url) => {
  const $ = HTML.parse(GET(url));
  const text = $('#ChapterContents').text();
  // 清洗格式（和之前逻辑一致）
  return text
    .replaceAll("最新网址：www.mayitxt.org","")
    .replaceAll(/\s+/g, '\n')
    .trim();                        
};

//排行榜
const rank = (title, category, page) => {
  let response = GET(`${title}${page + 1}.html`)
  let res = HTML2.parse (response)
  
  let books = []
  res('div.BOX > table > tbody > tr:gt(0)').forEach((child) => {
    books.push({
      name: child.st('td:nth-child(3) > a').text(),
      author: child.st('td:nth-child(6) > span').text(),
    category: child.st('td:nth-child(2) > a').text().replace("[", "").replace("]", ""),
    lastChapter: child.st('td:nth-child(4) > a').text(),
    update: child.st('td:nth-child(5)').text(),
    status: child.st('td:nth-child(7)').text(),
    detail: child.st('td:nth-child(3) > a').attr("href"),
    })
  })
  
  return JSON.stringify({
    end: false,
    books: books
  })
}

const ranks = [
{title: {
      key: 'http://www.xmayitxt.com/sort/1/',
      value: '玄幻'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/2/',
      value: '仙侠'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/3/',
      value: '都市'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/4/',
      value: '历史'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/5/',
      value: '军事'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/6/',
      value: '悬疑灵异'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/7/',
      value: '科幻'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/8/',
      value: '游戏'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/9/',
      value: '现代言情'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/10/',
      value: '古代言情'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/11/',
      value: '穿越'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/12/',
      value: '青春'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/13/',
      value: '豪门总裁'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/14/',
      value: '耽美同人'
    }}, {title: {
      key: 'http://www.xmayitxt.com/sort/15/',
      value: '其他'
    }},
]

var bookSource = JSON.stringify({
  name: "蚂蚁阅读网",
  url: "www.mayitxt.com",
  version: 100,
  authorization: "",
})
