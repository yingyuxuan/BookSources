// ==BookSource==
// @name 有度中文网
// @url www.yoduzw.com
// @version 101
// @description 有度中文网书源。v101: 兼容网站搜索双模板(grid .g_book + list li#hism)；修复detail URL绝对路径；添加catalog字段。站点使用自定义字体(read.ttf)对章节内容部分文字进行混淆，章节正文约20%字符为PUA编码，显示为乱码(无解)。
// ==/BookSource==

var bookSource = JSON.stringify({
    name: "有度中文网",
    url: "www.yoduzw.com",
    version: 101,
    authorization: "https://www.yoduzw.com/login.php"
});

const BASE = "https://www.yoduzw.com";

/**
 * 搜索书籍
 * POST https://www.yoduzw.com/sa  searchkey=关键词&searchtype=all
 * v101: 网站搜索含两种模板 — grid(.g_book) 和 list(li[id=hism])，需同时兼容
 */
function search(key) {
    const html = POST(BASE + "/sa", {
        data: "searchkey=" + ENCODE(key) + "&searchtype=all",
        headers: ["Content-Type:application/x-www-form-urlencoded"]
    });
    if (!html) return JSON.stringify([]);

    // 模板A: grid 卡片 <li class="g_col_2"><div class="g_book">
    let items = SELECT(html, ".g_book");
    if (items && items.length > 0) {
        return JSON.stringify(extractGrid(items));
    }
    // 模板B: list 列表 <li class="pr pb20 mb20" id="hism">
    items = SELECT(html, "li[id=hism]");
    if (items && items.length > 0) {
        return JSON.stringify(extractList(items));
    }
    return JSON.stringify([]);
}

// 模板A: grid 卡片 → .g_book > a[title] + h3.g_h4 + span._type
function extractGrid(items) {
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const aLinks = SELECT(item, "a[href]");
        if (!aLinks || aLinks.length === 0) continue;
        let href = ATTR(aLinks[0], "href") || "";
        let name = ATTR(aLinks[0], "title") || "";
        if (!name) {
            const h3s = SELECT(item, "h3.g_h4");
            if (h3s && h3s.length > 0) name = TEXT(h3s[0]).trim();
        }
        if (!name) continue;
        let detailUrl = href;
        if (detailUrl.indexOf("http") !== 0) detailUrl = BASE + detailUrl;
        let cover = "";
        const imgs = SELECT(item, "img[_src]");
        if (imgs && imgs.length > 0) {
            cover = ATTR(imgs[0], "_src") || "";
            if (cover && cover.indexOf("http") !== 0) cover = BASE + cover;
        }
        let author = "";
        const typeSpans = SELECT(item, "span._type");
        if (typeSpans && typeSpans.length > 0) author = TEXT(typeSpans[0]).trim();
        results.push({ name: name, author: author, cover: cover, detail: detailUrl });
    }
    return results;
}

// 模板B: list 列表 → li#hism > h3 a.c_strong[title] + em.c_small span.vam[1]
function extractList(items) {
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // 书名: h3 > a.c_strong[title]
        const titleLinks = SELECT(item, "h3 a.c_strong");
        if (!titleLinks || titleLinks.length === 0) continue;
        let name = ATTR(titleLinks[0], "title") || "";
        if (!name) name = TEXT(titleLinks[0]).trim();
        if (!name) continue;
        let href = ATTR(titleLinks[0], "href") || "";
        href = href.replace(/\?for-search/, "");
        let detailUrl = href;
        if (detailUrl.indexOf("http") !== 0) detailUrl = BASE + detailUrl;
        // 封面: a.g_thumb > img[_src]
        let cover = "";
        const thumbs = SELECT(item, "a.g_thumb img[_src]");
        if (thumbs && thumbs.length > 0) {
            cover = ATTR(thumbs[0], "_src") || "";
            if (cover && cover.indexOf("http") !== 0) cover = BASE + cover;
        }
        // 作者: em.c_small 中第2个 span.vam
        let author = "";
        const vamSpans = SELECT(item, "em.c_small span.vam");
        if (vamSpans && vamSpans.length >= 2) author = TEXT(vamSpans[1]).trim();
        results.push({ name: name, author: author, cover: cover, detail: detailUrl });
    }
    return results;
}

/**
 * 书籍详情
 * GET https://www.yoduzw.com/book/ID/
 * 优先使用 og:novel:* meta 标签
 * v101: 添加 catalog 字段 + 绝对 URL 保护
 */
function detail(url) {
    // 确保 URL 为绝对路径
    let fullUrl = url;
    if (fullUrl.indexOf("http") !== 0) fullUrl = BASE + fullUrl;
    const html = GET(fullUrl);
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
        summary: summary,
        status: status,
        category: category,
        words: words,
        update: updateTime,
        lastChapter: lastChapter,
        catalog: fullUrl
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
