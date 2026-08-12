const BASE = 'http://www.kenshuzw.la';

// 工具：取 meta 标签 content 属性
function meta($, prop) {
    let el = $(prop);
    if (!el || el.length === 0) return '';
    return ATTR(el[0], 'content');
}

// 工具：从 HTML 字符串提取纯文本
function stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * 搜索
 * @param {string} key
 * @returns {[{name, author, cover, detail}]}
 */
const search = (key) => {
    let body = 'area=2&searchkey=' + ENCODE(key, 'utf8');
    let html = POST(BASE + '/modules/article/search.php', {
        data: body,
        headers: ['Content-Type: application/x-www-form-urlencoded']
    });
    let array = [];
    let $ = HTML.parse(html);
    let items = $('.item.clearfix');
    if (typeof items === 'string') items = [items];
    items.forEach(function (item) {
        array.push({
            name: TEXT(SELECT(item, 'h3 > a')[0]),
            author: stripHtml(SELECT(item, '.author')[0]).replace('作者：', ''),
            cover: ATTR(SELECT(item, '.col-l > img')[0], 'src'),
            detail: ATTR(SELECT(item, 'h3 > a')[0], 'href')
        });
    });
    return JSON.stringify(array);
};

/**
 * 详情
 * @param {string} url
 * @returns {{summary, status, category, words, update, lastChapter, catalog}}
 */
const detail = (url) => {
    let html = GET(BASE + url);
    let $ = HTML.parse(html);

    let summary = meta($, 'meta[property="og:description"]')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .trim();

    let endIcon = $('.end-icon');
    let status = (endIcon && endIcon.length > 0) ? '完结' : '连载';

    let category = meta($, 'meta[property="og:novel:category"]');

    let wordsMatch = html.match(/字数(\d+)K/);
    let words = wordsMatch ? Math.round(parseInt(wordsMatch[1]) / 10) + '万' : '';

    let lastChapter = meta($, 'meta[property="og:novel:latest_chapter_name"]');
    let catalog = url.replace(/\/$/, '') + '/0/';

    return JSON.stringify({
        summary: summary,
        status: status,
        category: category,
        words: words,
        update: '',
        lastChapter: lastChapter,
        cover: meta($, 'meta[property="og:image"]'),
        catalog: catalog
    });
};

/**
 * 目录
 * @param {string} url
 * @returns {[{name, url}]}
 */
const catalog = (url) => {
    let html = GET(BASE + url);
    let array = [];
    let items = SELECT(html, '.clearfix.chapter-list > li > span');
    if (typeof items === 'string') items = [items];
    items.forEach(function (item) {
        let a = SELECT(item, 'a')[0];
        array.push({
            name: TEXT(a),
            url: ATTR(a, 'href')
        });
    });
    return JSON.stringify(array);
};

/**
 * 章节
 * @param {string} url
 * @returns {string}
 */
const chapter = (url) => {
    let html = GET(BASE + url);
    let article = SELECT(html, '.article-con')[0];
    let content = article
        .replace(/<div[^>]*id="center_tip"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/以下是啃书小说网.*?收集并整理.*?出版社。/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return content;
};

var bookSource = JSON.stringify({
    name: '啃书网',
    url: 'www.kenshuzw.la',
    version: 100
});
