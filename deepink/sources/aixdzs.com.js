// ==BookSource==
// name: 爱下电子书
// url: https://www.aixdzs.com
// version: 100
// description: 爱下电子书(aixdzs.com) - txt/epub下载站, 支持搜索/详情/目录/章节
// author: WorkBuddy
// ==/BookSource==

const BASE = 'https://www.aixdzs.com';

// ── 搜索 ──────────────────────────────────────────────
const search = (key) => {
    let html = GET(BASE + '/bsearch?q=' + ENCODE(key));
    if (!html) return JSON.stringify([]);
    let items = SELECT(html, '.box_k ul li');
    if (!items || items.length === 0) return JSON.stringify([]);

    if (typeof items === 'string') items = [items];
    let result = [];
    for (let i = 0; i < items.length; i++) {
        let $ = HTML.parse(items[i]);
        let titleA = $('.b_name a');
        let novelUrl = ATTR(titleA, 'href');          // /novel/{title}
        let title = TEXT(titleA);
        let authorA = $('.l1 a');
        let author = TEXT(authorA);
        let coverImg = $('.list_img img');
        let cover = ATTR(coverImg, 'src');
        let introP = $('.b_intro');
        let intro = TEXT(introP);
        let statusI = $('.l3 i');
        let status = TEXT(statusI);
        let wordsSpan = $('.l2');
        let wordsText = TEXT(wordsSpan);
        let words = wordsText.replace('字数：', '').replace('字数:', '').trim();
        let latestA = $('.l5 a');
        let latestUrl = ATTR(latestA, 'href');         // /read/{id1}/{id2}/p{n}.html
        let lastChapter = TEXT(latestA);

        // 从 read URL 提取 id1/id2
        let id1 = '', id2 = '';
        if (latestUrl) {
            let m = latestUrl.match(/\/read\/(\d+)\/(\d+)\//);
            if (m) { id1 = m[1]; id2 = m[2]; }
        }

        // 组合 detail URL: novel_url|||id1|||id2
        let detailUrl = novelUrl;
        if (id1 && id2) {
            detailUrl = novelUrl + '|||' + id1 + '|||' + id2;
        }

        result.push({
            name: title,
            author: author,
            cover: cover,
            detail: detailUrl,
            intro: intro || '',
            words: words,
            status: (status === '完结' || status === '全本') ? '完结' : '连载',
            lastChapter: lastChapter
        });
    }
    return JSON.stringify(result);
}

// ── 详情 ──────────────────────────────────────────────
const detail = (url) => {
    // 解析 URL: /novel/{title}|||{id1}|||{id2}
    let parts = url.split('|||');
    let novelUrl = parts[0];
    let id1 = parts.length > 1 ? parts[1] : '';
    let id2 = parts.length > 2 ? parts[2] : '';

    let novelHtml = GET(BASE + novelUrl);
    let is404 = !novelHtml || novelHtml.indexOf('404ERROR') >= 0;

    let title = '', author = '', cover = '', category = '', status = '', words = '', 
        summary = '', lastChapter = '', updateTime = '', catalogUrl = '';

    if (!is404) {
        // 从 /novel/ 页面提取
        let $n = HTML.parse(novelHtml);

        // meta description
        let meta = SELECT(novelHtml, 'meta[name="description"]');
        if (meta && meta.length > 0) {
            let mstr = typeof meta === 'string' ? meta : meta[0];
            let desc = ATTR(mstr, 'content');
            // 格式: 剑来，作者：烽火戏诸侯，分类：玄幻奇幻，状态：连载中，字数：1385.33万字，章节：1278章。
            if (desc) {
                let dm;
                dm = desc.match(/^(.+?)[，,]/);
                if (dm) title = dm[1];
                dm = desc.match(/作者[：:]\s*(.+?)[，,]/);
                if (dm) author = dm[1];
                dm = desc.match(/分类[：:]\s*(.+?)[，,]/);
                if (dm) category = dm[1];
                dm = desc.match(/状态[：:]\s*(.+?)[，,]/);
                if (dm) status = dm[1];
                dm = desc.match(/字数[：:]\s*(.+?)[，,]/);
                if (dm) words = dm[1];
            }
        }

        // h1 标题（覆盖 meta 提取的）
        let h1 = $n('h1');
        let h1Text = TEXT(h1);
        if (h1Text) title = h1Text;

        // 封面图（第一个非 logo 的 img）
        let imgs = SELECT(novelHtml, 'img');
        if (imgs && imgs.length > 0) {
            if (typeof imgs === 'string') imgs = [imgs];
            for (let ci = 0; ci < imgs.length; ci++) {
                let src = ATTR(imgs[ci], 'src');
                if (src && src.indexOf('logo') < 0 && src.indexOf('error') < 0 && src.indexOf('qr.') < 0) {
                    cover = src;
                    break;
                }
            }
        }

        // 简介
        let introDiv = SELECT(novelHtml, '.intro');
        if (introDiv && introDiv.length > 0) {
            summary = TEXT(typeof introDiv === 'string' ? HTML.parse(introDiv) : HTML.parse(introDiv[0]));
            summary = summary.replace('内容简介', '').trim();
        }

        // 更新时间/最新章节
        let dm2;
        dm2 = novelHtml.match(/最新[：:]\s*(.*?)</);
        if (dm2) lastChapter = dm2[1];
        dm2 = novelHtml.match(/时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
        if (dm2) updateTime = dm2[1];

        // 状态标准化
        if (status === '全本') status = '完结';
        if (!status || status === '连载中') status = '连载';

    } else {
        // 回退到下载页
        if (!id1 || !id2) return JSON.stringify(null);
        let downHtml = GET(BASE + '/d/' + id1 + '/' + id2 + '/');
        if (!downHtml || downHtml.indexOf('404ERROR') >= 0) return JSON.stringify(null);

        let meta = SELECT(downHtml, 'meta[name="description"]');
        if (meta && meta.length > 0) {
            let mstr2 = typeof meta === 'string' ? meta : meta[0];
            let desc = ATTR(mstr2, 'content');
            if (desc) {
                let dm;
                dm = desc.match(/^(.+?)[，,]/);
                if (dm) title = dm[1];
                dm = desc.match(/作者[：:]\s*(.+?)[，,]/);
                if (dm) author = dm[1];
                dm = desc.match(/分类[：:]\s*(.+?)[，,]/);
                if (dm) category = dm[1];
                dm = desc.match(/状态[：:]\s*(.+?)[，,]/);
                if (dm) status = dm[1];
                dm = desc.match(/字数[：:]\s*(.+?)[，,]/);
                if (dm) words = dm[1];
            }
        }
        if (status === '全本') status = '完结';
        if (!status || status === '连载中') status = '连载';
    }

    if (!title) return JSON.stringify(null);

    // catalog URL: 下载页
    catalogUrl = '/d/' + id1 + '/' + id2 + '/';

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
        catalog: catalogUrl
    });
}

// ── 目录 ──────────────────────────────────────────────
const catalog = (url) => {
    let html = GET(BASE + url);
    if (!html || html.indexOf('404ERROR') >= 0) return JSON.stringify([]);

    let links = SELECT(html, '.catalog ul li.chapter a');
    if (!links || links.length === 0) return JSON.stringify([]);
    if (typeof links === 'string') links = [links];

    let array = [];
    for (let i = 0; i < links.length; i++) {
        let name = TEXT(links[i]);
        let href = ATTR(links[i], 'href');
        let isVip = false;  // 爱下无VIP章节概念
        array.push({
            name: name,
            url: href,
            vip: isVip
        });
    }
    return JSON.stringify(array);
}

// ── 章节 ──────────────────────────────────────────────
const chapter = (url) => {
    let html = GET(BASE + url);
    if (!html || html.indexOf('404ERROR') >= 0) return '';

    let contentDivs = SELECT(html, '.content');
    if (!contentDivs || contentDivs.length === 0) return '';

    let contentHtml = typeof contentDivs === 'string' ? contentDivs : contentDivs[0];
    // SELECT 返回外层 HTML，可直接当字符串用
    let text = contentHtml;
    // 去标签
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&hellip;/g, '…');
    text = text.replace(/&mdash;/g, '—');
    text = text.replace(/&ldquo;/g, '\u201C');
    text = text.replace(/&rdquo;/g, '\u201D');
    return text.trim();
}

// ── 发现 (profile) ────────────────────────────────────
const profile = () => {
    return JSON.stringify({
        basic: {
            name: '爱下电子书',
            url: BASE,
            author: 'WorkBuddy'
        },
        extra: []
    });
}

// ── 排名 ──────────────────────────────────────────────
const rank = (title, cat, page) => {
    return JSON.stringify({ end: true, books: [] });
}

// ── 书架 ──────────────────────────────────────────────
const bookshelf = (page) => {
    return JSON.stringify({ end: true, books: [] });
}

var bookSource = JSON.stringify({
name: "爱下电子书",
url: "www.aixdzs.com",
version: 100
})