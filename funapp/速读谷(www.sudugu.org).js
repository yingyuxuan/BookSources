/**
    JS书源与厚墨JS书源基本一致,但是与厚墨JS书源理念不同,我的理念是,尽量返回尽可能多的书籍信息;
    @returns注解中, 带有[]的参数,是可以空的;可以空,但是不建议.
*/

/**
 * 搜索
 * @params {string} key 搜索内容
 * @params {int} page 搜索页数,默认从0开始;
 * @returns { [{name, author, cover, [summary], [status], [category], [words], [update], [lastChapter], detail, [tags]}], end: true/false}
 */
const search = (key, page=0) => {
  let response = Http2.url(`https://www.sudugu.org/i/sor.aspx?key=${key}`)
  .header("Content-Type", "text/html;charset-utf-8").get()

  let array = []
  let $ = HTML2.parse(response.body.toString())
  $('div.container > div.item').forEach((child) => {
    array.push({
      name: child.st('div.itemtxt > h3 > a').text(),
      author: child.st('div.itemtxt > p:nth-child(3) > a').text().replace("作者：",""),
      cover:child.st('a > img').attr("src"),
      status: child.st('div.itemtxt > p:nth-child(2) > span:nth-child(1)').text(),
      category: child.st('div.itemtxt > p:nth-child(2) > span:nth-child(2)').text(),
      detail: child.st('div.itemtxt > h3 > a').attr("href"),
      lastChapter: child.st('div.itemtxt > ul > li:nth-child(1) > a').text(),
      update: child.st('div.itemtxt > ul > li:nth-child(1) > i').text(),
    })
  })

  return JSON.stringify(array)

}

/**
 * 详情
 * @params {string} bookId  书籍URL或ID
 * @returns {[name], [author], [cover], [summary], [status], [category], [words], [update], [lastChapter], catalog, [tags]}
 */
const detail = (bookId) => {
  let response = GET("https://www.sudugu.org/"+bookId)
  let $ = HTML.parse(response)
  let book = {
    name: $('body > div.container > div.item > div > h1 > a').text(),
    author: $('body > div.container > div.item > div > p:nth-child(3) > a').text().replace("作者：",""),
    summary: $('body > div.container > div:nth-child(3) ').text(),
    cover: $('body > div.container > a > img').attr("src"),
    words: $('body > div.container > div.item > div > h1 > i').text().replace("字", ""),
    update: $('body > div.container > div.item > div > ul > li:nth-child(1) > i').text(),
    lastChapter: $('body > div.container > div.item > div > ul > li:nth-child(1) > a').text(),
    catalog: $('#dir > a').attr("href")
  }
  return JSON.stringify(book)

}


/**
 * 目录
 * @params {string} bookId  书籍URL或ID
 * @returns [{ [name], [url], [vip], [volume], [buy], [update], [words] }]
 */
const catalog = (bookId) => {
  let array = [];
  let page = 1; // 初始页码
  const pageSize = 999; // 每页最大条数
  let isContinue = true; // 是否继续请求下一页
  while (isContinue) {
    try {
      // 拼接分页URL：第一页无/p-x，从第二页开始加/p-{page}
      let url = `https://www.sudugu.org/${bookId}`;
      if (page > 1) {
        url = url.replace("/#dir","") +`/p-${page}.html`;
      }
      // 请求当前页数据
      let response = GET(url);
      // 解析HTML
      let $ = HTML.parse(response);
      // 获取当前页的目录列表
      let currentPageItems = $('#list > ul > li');
      // 解析当前页数据并添加到总数组
      currentPageItems.forEach((booklet) => {
        let $item = HTML.parse(booklet);
        array.push({
          name: $item('a').text(),
          url: $item('a').attr('href'),
        });
      });
      // 判断是否继续请求：当前页数据量等于pageSize则继续，否则停止
      if (currentPageItems.length < pageSize || page >= 4) {
        isContinue = false;
      } else {
        page++; // 页码自增，准备请求下一页
      }
    } catch (e) {
      // 捕获404或其他请求异常，停止循环
      isContinue = false;
      console.log(`第${page}页请求失败，停止分页获取：`, e);
    }
  }
  return JSON.stringify(array);
}


/**
 * 章节
 * @params {string} chapterId  章节URL或ID
 * @returns {string}
 */
const chapter = (chapterId) => {
  let text= "";
  let page = 1; // 初始页码
  let isContinue = true; // 是否继续请求下一页
  while(isContinue){
    try {
      let url = "https://www.sudugu.org/"+chapterId;
      if (page > 1) {
        url = url.replace(".html","") +`-${page}.html`;
      }
      let response = GET(url)
      let $ = HTML.parse(response)
      text += $('div.con').text().replaceAll(/\s+/g, '\n')
      let nextflag = $("div.prenext > span:nth-child(3) > a").text()
      console.log(nextflag)
      if("下一章" == nextflag || page >= 10){
        isContinue = false;
      }else{
          page++;
      }
    } catch (e) {
      // 捕获404或其他请求异常，停止循环
      isContinue = false;
      console.log(`第${page}页请求失败，停止分页获取：`, e);
    }
  }
  return text;
    // 获得评论
    // {
    //      content: content,
    //      comment: [ {段落, id} ]
    // }
}

/**
 * 分类/排行/书城
 * @title     总分类或大分类id
 * @category  大分类下子分类id
 * @page      页数索引
 * @params {string} url
 * @returns { [{name, author, cover, [summary], [status], [category], [words], [update], [lastChapter], detail, [tags]}], end: true/false}
 */
const rank = (title, category, page) => {
    return "";
}

/**
 * 个人
 * @returns {[{url, nickname, recharge, balance[{name, coin}], sign}]}
 */
const profile = () => {
    return "";
}

/**
 * 获得评论
 * @returns [ { 用户名, 用户头像, 评论日期, 评论内容, 支持数量, 反对数量 } ]
 */
const comment = (bookID, chapterId) => {
    return [];
}

/**
 * 书架
 * @returns [ {name, author, cover, [summary], [status], [category], [words], [update], [lastChapter], detail, [tags]} ]
 */
const bookShelf =() => {

}

//const onLoad = (l, c) => {
//    return false;
//}

/**
 * 个人
 * @name          书源名称，可以重复, 但不建议重复;
 * @url           书源host, 不可重复, 重复则视为同一个,只会保留最新的;
 * @version       暂时无用;
 * @authorization 暂时无用;
 * @cookies       暂时无用;
 * 暂不支持;
 */

var bookSource = JSON.stringify({
    name: "速读谷",
    url: "www.sudugu.org",
    version: 100,
    authorization: "",
    useragent: "", // 登录时使用的默认UA;
    cookies: []
})

