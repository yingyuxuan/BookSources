// ==BookSource==
// @name 有度中文网
// @url www.yoduzw.com
// @version 100
// @description 有度中文网书源。站点使用自定义字体(read.ttf)对章节内容部分文字进行混淆，章节正文约20%字符为PUA编码，显示为乱码(无解)。
// ==/BookSource==

var bookSource = JSON.stringify({
    name: "有度中文网",
    url: "www.yoduzw.com",
    version: 100,
    authorization: "https://www.yoduzw.com/login.php"
});

const BASE = "https://www.yoduzw.com";

/**
 * 搜索书籍
 * POST https://www.yoduzw.com/sa  searchkey=关键词&searchtype=all
 */
function search(key) {
    const html = POST(BASE + "/sa", {
        data: "searchkey=" + ENCODE(key) + "&searchtype=all",
        headers: ["Content-Type:application/x-www-form-urlencoded"]
    });
    if (!html) {
        return JSON.stringify([]);
    }
    // 搜索结果li: <li class="pr pb20 mb20" id="hism">
    const items = SELECT(html, "li[id=hism]");
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // 书名链接 <h3><a href="/book/ID/?for-search" title="书名">
        const titleLink = SELECT(item, "h3 a");
        if (!titleLink || titleLink.length === 0) continue;
        // 优先用 title 属性取书名
        let name = ATTR(titleLink[0], "title") || "";
        if (!name) name = TEXT(titleLink[0]).trim();
        if (!name) continue;
        const href = ATTR(titleLink[0], "href") || "";
        // 去除 ?for-search 后缀
        const detailUrl = href.replace(/\?for-search/, "");
        // 封面(可能没有，img 使用 _src 懒加载)
        const coverImg = SELECT(item, "img[_src]");
        let cover = "";
        if (coverImg && coverImg.length > 0) {
            cover = ATTR(coverImg[0], "_src") || "";
            if (cover && cover.indexOf("http") !== 0) {
                cover = BASE + cover;
            }
        }
        // 作者/分类 <em><span>分类</span>...<span>作者</span>
        const allSpans = SELECT(item, "em span");
        let author = "";
        let category = "";
        if (allSpans && allSpans.length >= 2) {
            category = TEXT(allSpans[0]).trim();
            author = TEXT(allSpans[1]).trim();
        }
        // 简介 <p class="fs16 mb10 c_strong g_ells">
        const descP = SELECT(item, "p.c_strong");
        let summary = "";
        if (descP && descP.length > 0) {
            summary = TEXT(descP[0]).trim();
        }
        // 最新章节
        const latestA = SELECT(item, "p.ell a");
        let lastChapter = "";
        if (latestA && latestA.length > 0) {
            lastChapter = TEXT(latestA[0]).trim();
        }
        results.push({
            name: name,
            author: author,
            cover: cover,
            detail: detailUrl,
            summary: summary,
            category: category,
            lastChapter: lastChapter
        });
    }
    return JSON.stringify(results.length > 0 ? results : []);
}

/**
 * 书籍详情
 * GET https://www.yoduzw.com/book/ID/
 * 优先使用 og:novel:* meta 标签
 */
function detail(url) {
    const html = GET(url);
    if (!html) return JSON.stringify(null);

    let name = "", author = "", cover = "", category = "", status = "",
        summary = "", words = "", updateTime = "", lastChapter = "";

    // 1. og:novel:* meta 标签(最可靠)
    const metas = SELECT(html, "meta[property]");
    if (metas && metas.length > 0) {
        for (let i = 0; i < metas.length; i++) {
            const prop = ATTR(metas[i], "property") || "";
            const content = ATTR(metas[i], "content") || "";
            if (prop === "og:novel:book_name") name = content;
            else if (prop === "og:novel:author") author = content;
            else if (prop === "og:novel:category") category = content;
            else if (prop === "og:novel:status") status = content;
            else if (prop === "og:novel:update_time") updateTime = content;
            else if (prop === "og:novel:latest_chapter_name") lastChapter = content;
            else if (prop === "og:image") cover = content;
        }
    }

    // 2. 封面(meta og:image可能缺失)
    if (!cover) {
        const coverImgs = SELECT(html, ".det-info .cover img");
        if (coverImgs && coverImgs.length > 0) {
            cover = ATTR(coverImgs[0], "src") || "";
        }
    }

    // 3. 简介 <div class="det-abt"> <p>
    if (!summary) {
        const abtPs = SELECT(html, ".det-abt p");
        if (abtPs && abtPs.length > 0) {
            summary = TEXT(abtPs[0]).trim();
        }
    }

    // 4. 字数(在 <strong> 标签中, 格式如 "17 万字")
    if (!words) {
        const strongs = SELECT(html, ".det-info strong");
        if (strongs && strongs.length > 0) {
            for (let i = 0; i < strongs.length; i++) {
                const txt = TEXT(strongs[i]).trim();
                if (txt && /万字/.test(txt)) {
                    words = txt;
                    break;
                }
            }
        }
    }

    // 5. fallback: 从 h1 取书名, 从 ._tags 取作者
    if (!name) {
        const h1s = SELECT(html, ".det-info h1");
        if (h1s && h1s.length > 0) name = TEXT(h1s[0]).trim();
    }
    if (!author) {
        const authorAs = SELECT(html, ".det-info ._tags a");
        if (authorAs && authorAs.length > 0) author = TEXT(authorAs[0]).trim();
    }

    return JSON.stringify({
        name: name,
        author: author,
        cover: cover,
        detail: url,
        summary: summary,
        status: status,
        category: category,
        words: words,
        update: updateTime,
        lastChapter: lastChapter
    });
}

/**
 * 章节目录
 * GET https://www.yoduzw.com/book/ID/
 * 所有章节已预加载在 <ol id="chapterList"> 中
 */
function catalog(url) {
    const html = GET(url);
    if (!html) return JSON.stringify([]);
    const chapters = [];
    // 提取章节列表项
    const items = SELECT(html, "#chapterList li.w33p");
    if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const links = SELECT(item, "a");
            if (!links || links.length === 0) continue;
            const href = ATTR(links[0], "href");
            if (!href) continue;
            const spans = SELECT(item, "span");
            let cname = "";
            if (spans && spans.length > 0) {
                cname = TEXT(spans[0]).trim();
            }
            if (!cname) cname = TEXT(links[0]).trim();
            if (!cname) continue;
            let fullUrl = href;
            if (fullUrl.indexOf("http") !== 0) {
                fullUrl = BASE + fullUrl;
            }
            chapters.push({
                name: cname,
                url: fullUrl
            });
        }
    }
    return JSON.stringify(chapters);
}

/**
 * 章节内容
 * 注意: 站点使用自定义 read.ttf 字体混淆，约20%字符显示为乱码(PUA编码)
 * 支持多页章节(_2.html, _3.html)
 */
function chapter(url) {
    let allText = "";
    let pageNum = 0;
    let currentUrl = url;
    const maxPages = 10; // 防止无限循环，一章一般不超过10页
    
    while (currentUrl && pageNum < maxPages) {
        const html = GET(currentUrl);
        if (!html) break;
        // 提取正文 <div id="TextContent"> 中的 <p>
        const ps = SELECT(html, "#TextContent p");
        if (ps && ps.length > 0) {
            for (let i = 0; i < ps.length; i++) {
                const txt = TEXT(ps[i]).trim();
                if (!txt) continue;
                // 跳过系统提示信息
                if (txt.indexOf("抱歉") >= 0 || txt.indexOf("浏览器") >= 0) continue;
                allText += txt + "\n\n";
            }
        }
        // 检查多页：页面使用 _N.html 后缀分页
        if (pageNum === 0) {
            // 第一页后，尝试 _2.html, _3.html ...
            const baseUrl = currentUrl.replace(/\.html$/, "");
            let foundNext = false;
            for (let n = 2; n <= maxPages; n++) {
                const testUrl = baseUrl + "_" + n + ".html";
                const testHtml = GET(testUrl);
                if (testHtml && testHtml.indexOf("TextContent") >= 0) {
                    currentUrl = testUrl;
                    pageNum++;
                    foundNext = true;
                    break;
                }
            }
            if (!foundNext) break;
        } else {
            // 已在分页中，继续尝试下一页
            const baseUrl = url.replace(/\.html$/, "");
            const nextUrl = baseUrl + "_" + (pageNum + 2) + ".html";
            const testHtml = GET(nextUrl);
            if (testHtml && testHtml.indexOf("TextContent") >= 0) {
                currentUrl = nextUrl;
                pageNum++;
            } else {
                break;
            }
        }
    }
    if (!allText) {
        return allText;
    }
    return allText.trim();
}

/**
 * 书架/排行 — 不需要
 */
function profile() {
    return JSON.stringify(null);
}
