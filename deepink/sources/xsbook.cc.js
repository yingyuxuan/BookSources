var bookSource = JSON.stringify({
    name: "平凡文学网",
    url: "www.xsbook.cc",
    version: 100
});

const BASE = 'https://www.xsbook.cc';

// ── 搜索 ──────────────────────────────────────────────
function search(key) {
    const html = GET(BASE + '/search.php?q=' + ENCODE(key));
    if (!html) return JSON.stringify([]);
    let items = SELECT(html, '.box.hot .row dl');
    if (!items || items.length === 0) return JSON.stringify([]);
    if (typeof items === 'string') items = [items];
    const result = [];
    for (let i = 0; i < items.length; i++) {
        // title + detail URL from h3 > a
        const atag = SELECT(items[i], 'h3 a');
        let title = TEXT(atag);
        const detailUrl = ATTR(atag, 'href');
        if (!title || !detailUrl) continue;
        title = title.replace(/^\[[^\]]+\]/, '').trim();
        // cover from dt img
        const imgs = SELECT(items[i], 'dt img');
        let cover = '';
        if (imgs && imgs.length > 0) {
            cover = ATTR(typeof imgs === 'string' ? imgs : imgs[0], 'src');
            if (cover && !cover.startsWith('http')) cover = BASE + cover;
        }
        // collect all .book_other texts: author, status, update, latest chapter
        let bOthers = SELECT(items[i], '.book_other');
        if (!bOthers) bOthers = [];
        if (typeof bOthers === 'string') bOthers = [bOthers];
        let author = '', status = '连载', lastChapter = '';
        for (let j = 0; j < bOthers.length; j++) {
            const txt = TEXT(bOthers[j]);
            if (!txt) continue;
            // author: "作者：xxx"
            if (txt.indexOf('作者') >= 0) {
                const sm = txt.match(/作者[：:]\s*(.+)/);
                if (sm) author = sm[1].trim();
            }
            // status: "状态：完结" or "状态：连载" or "状态：完本"
            if (txt.indexOf('状态') >= 0) {
                if (txt.indexOf('完本') >= 0 || txt.indexOf('完结') >= 0) status = '完结';
            }
            // latest chapter: extract from link inside this dd
            if (txt.indexOf('最新章节') >= 0 || txt.indexOf('最新') >= 0) {
                const la = SELECT(bOthers[j], 'a');
                if (la && la.length > 0) {
                    lastChapter = TEXT(typeof la === 'string' ? la : la[0]);
                }
            }
        }
        result.push({
            name: title,
            author: author,
            cover: cover,
            detail: detailUrl,
            status: status,
            lastChapter: lastChapter || ''
        });
    }
    return JSON.stringify(result);
}

// ── 详情 ──────────────────────────────────────────────
function detail(url) {
    const html = GET(BASE + url);
    if (!html) return JSON.stringify(null);
    // Use OG meta tags
    let allMetas = SELECT(html, 'meta');
    if (!allMetas) allMetas = [];
    if (typeof allMetas === 'string') allMetas = [allMetas];
    let title = '', author = '', cover = '', category = '', status = '连载',
        words = '', summary = '', updateTime = '', lastChapter = '';
    for (let i = 0; i < allMetas.length; i++) {
        const prop = ATTR(allMetas[i], 'property');
        if (!prop || prop.indexOf('og:') !== 0) continue;
        const cont = ATTR(allMetas[i], 'content');
        if (!cont) continue;
        if (prop === 'og:novel:book_name') title = cont;
        else if (prop === 'og:novel:author') author = cont;
        else if (prop === 'og:novel:category') category = cont.replace('小说', '');
        else if (prop === 'og:novel:status') status = (cont === '完结' || cont === '完本') ? '完结' : '连载';
        else if (prop === 'og:novel:update_time') updateTime = cont;
        else if (prop === 'og:novel:latest_chapter_name') lastChapter = cont;
        else if (prop === 'og:image' && !cover) cover = cont;
    }
    if (cover && cover.indexOf('//') === 0) cover = 'https:' + cover;
    // fallback: h1 title
    if (!title) {
        const h1 = SELECT(html, 'h1');
        if (h1 && h1.length > 0) title = TEXT(typeof h1 === 'string' ? h1 : h1[0]);
    }
    // fallback: cover from img-thumbnail
    if (!cover) {
        const thumbImg = SELECT(html, '.img-thumbnail');
        if (thumbImg && thumbImg.length > 0) {
            cover = ATTR(typeof thumbImg === 'string' ? thumbImg : thumbImg[0], 'src');
            if (cover && !cover.startsWith('http')) cover = BASE + cover;
        }
    }
    // intro
    const introDiv = SELECT(html, '#intro_pc');
    if (introDiv && introDiv.length > 0) {
        summary = TEXT(typeof introDiv === 'string' ? HTML.parse(introDiv) : HTML.parse(introDiv[0]));
        summary = summary.replace('简介：', '').replace(/您要是觉得.*推荐哦!/, '').trim();
    }
    if (!title) return JSON.stringify(null);
    return JSON.stringify({
        name: title,
        author: author || '',
        cover: cover || '',
        category: category || '',
        status: status || '连载',
        words: words || '',
        summary: summary || '',
        update: updateTime || '',
        lastChapter: lastChapter || '',
        catalog: url
    });
}

// ── 目录 ──────────────────────────────────────────────
function catalog(url) {
    // url = /files/article/html/{catId}/{bookId}/
    const array = [];
    // First page = the detail page itself (has chapters at bottom)
    let html = GET(BASE + url);
    if (!html) return JSON.stringify([]);
    // find the max page number
    const pageOpts = SELECT(html, 'a[href*=\"index_\"]');
    let maxPage = 1;
    if (pageOpts && pageOpts.length > 0) {
        if (typeof pageOpts === 'string') pageOpts = [pageOpts];
        for (let i = 0; i < pageOpts.length; i++) {
            const href = ATTR(pageOpts[i], 'href');
            if (!href) continue;
            const m = href.match(/index_(\d+)\.html/);
            if (m) {
                const p = parseInt(m[1], 10);
                if (p > maxPage && p < 99999) maxPage = p;
            }
        }
    }
    // determine base path
    const basePath = url.replace(/\/$/, '');
    // collect chapters from all pages
    for (let page = 1; page <= maxPage; page++) {
        let pageUrl;
        if (page === 1) {
            pageUrl = BASE + url;
        } else {
            pageUrl = BASE + basePath + '/index_' + page + '.html';
        }
        if (page > 1) {
            html = GET(pageUrl);
            if (!html) continue;
        }
        const links = SELECT(html, 'a[href*=\"/files/article/html/\"]');
        if (!links || links.length === 0) continue;
        if (typeof links === 'string') links = [links];
        for (let i = 0; i < links.length; i++) {
            const href = ATTR(links[i], 'href');
            const name = TEXT(links[i]);
            if (!href || !name) continue;
            const m = href.match(/\/files\/article\/html\/\d+\/\d+\/(\d+)\.html/);
            if (!m) continue;
            array.push({
                name: name,
                url: href,
                vip: false
            });
        }
    }
    // deduplicate by URL (first/latest chapter links appear multiple times)
    const seen = {};
    const deduped = [];
    for (let i = 0; i < array.length; i++) {
        if (!seen[array[i].url]) {
            seen[array[i].url] = true;
            deduped.push(array[i]);
        }
    }
    return JSON.stringify(deduped);
}

// ── 章节 ──────────────────────────────────────────────
function chapter(url) {
    // url = /files/article/html/{catId}/{bookId}/{chapterId}.html
    // May have multi-page: {chapterId}_2.html, {chapterId}_3.html, etc.
    let allText = '';
    let currentUrl = url;
    // extract base chapter path
    const baseMatch = url.match(/^(.+?)(?:_(\d+))?\.html$/);
    const basePath = baseMatch ? baseMatch[1] : url.replace(/\.html$/, '');
    let page = baseMatch && baseMatch[2] ? parseInt(baseMatch[2], 10) : 1;
    // collect all pages
    while (currentUrl) {
        const html = GET(BASE + currentUrl);
        if (!html) break;
        const article = SELECT(html, 'article');
        if (!article || article.length === 0) break;
        const artHtml = typeof article === 'string' ? article : article[0];
        let text = artHtml;
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<[^>]*>/g, '');
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&hellip;/g, '…');
        text = text.replace(/&mdash;/g, '—');
        text = text.replace(/&ldquo;/g, '\u201C');
        text = text.replace(/&rdquo;/g, '\u201D');
        // strip page indicator like "第(1/3)页"
        text = text.replace(/第\(\d+\/\d+\)页/g, '');
        allText += text.trim() + '\n';
        // check for next multi-page
        const nextLink = SELECT(html, '#next1');
        if (!nextLink || nextLink.length === 0) break;
        const nextHref = ATTR(typeof nextLink === 'string' ? nextLink : nextLink[0], 'href');
        if (!nextHref || nextHref === currentUrl) break;
        // only follow if it matches multi-page pattern
        if (nextHref.indexOf(basePath + '_') === 0 || nextHref.indexOf(basePath + '.html') === -1) {
            // check if it's a multi-page (has _N suffix)
            const m2 = nextHref.match(/_(\d+)\.html$/);
            if (m2) {
                const nextPage = parseInt(m2[1], 10);
                if (nextPage > page) {
                    page = nextPage;
                    currentUrl = nextHref;
                    continue;
                }
            }
        }
        break;
    }
    return allText.trim();
}

// ── 发现 ──────────────────────────────────────────────
function profile() {
    return JSON.stringify({
        basic: {
            name: '平凡文学',
            url: BASE,
            author: 'WorkBuddy'
        },
        extra: []
    });
}

// ── 排行 ──────────────────────────────────────────────
function rank(title, cat, page) {
    return JSON.stringify({ end: true, books: [] });
}

// ── 书架 ──────────────────────────────────────────────
function bookshelf(page) {
    return JSON.stringify({ end: true, books: [] });
}
