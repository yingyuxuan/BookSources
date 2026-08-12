const BASE = 'https://www.sudugu.org';

/**
 * 自用书源 - 速读谷 www.sudugu.org
 * 测试: 2026-08-11 搜索/详情/目录/章节 全部可用
 * 注意: 目录无分页（单页可达~1000章），少部分长篇有2页；
 *        章节可能跨页（-2.html, -3.html），chapter() 自动合并所有页
 * @version 100
 */

// ── 搜索 ──────────────────────────────────────────────
const search = (key) => {
    let html = GET(BASE + '/i/sor.aspx?key=' + ENCODE(key, 'utf8'));
    let array = [];
    let $ = HTML.parse(html);
    let items = $('.item');
    if (!items || items.length === 0) return JSON.stringify(array);
    if (typeof items === 'string') items = [items];
    items.forEach(function (item) {
        let nameA = SELECT(item, 'h3 > a')[0];
        if (!nameA) return;
        let authorA = SELECT(item, 'a[href^="/zuozhe/"]')[0];
        let imgEl = SELECT(item, 'img')[0];
        array.push({
            name: TEXT(nameA),
            author: authorA ? TEXT(authorA) : '',
            cover: imgEl ? ATTR(imgEl, 'src') : '',
            detail: ATTR(nameA, 'href')
        });
    });
    return JSON.stringify(array);
};

// ── 详情 ──────────────────────────────────────────────
const detail = (url) => {
    let html = GET(BASE + url);

    // 书名 & 字数（h1 含 <i>xxx万字</i><a>书名</a>）
    let titleA = SELECT(html, '.itemtxt h1 > a')[0];
    let titleI = SELECT(html, '.itemtxt h1 > i')[0];

    // 封面
    let imgEl = SELECT(html, '.item > a > img')[0];

    // 状态 & 分类
    let spans = SELECT(html, '.itemtxt p span');
    let status = '连载';
    let category = '';
    if (spans && spans.length >= 1) {
        let sText = TEXT(spans[0]);
        status = sText.indexOf('完结') !== -1 ? '完结' : '连载';
    }
    if (spans && spans.length >= 2) {
        category = TEXT(spans[1]);
    }

    // 作者
    let authorA = SELECT(html, '.itemtxt a[href^="/zuozhe/"]')[0];

    // 更新时间
    let updateSpan = SELECT(html, '#dir span')[0];

    // 简介（取 .des.bb 下所有段落拼接）
    let desParas = SELECT(html, '.des.bb p');
    let summary = '';
    if (desParas && desParas.length > 0) {
        let parts = [];
        desParas.forEach(function (p) {
            let t = TEXT(p);
            if (t) parts.push(t);
        });
        summary = parts.join('\n');
    }

    // 最近章节名
    let chLinks = SELECT(html, '#list.dir ul > li:last-child > a');
    let lastChapter = '';
    if (chLinks && chLinks.length > 0) {
        lastChapter = TEXT(chLinks[0]);
    }

    let book = {
        update: updateSpan ? TEXT(updateSpan).replace('更新时间：', '') : '',
        lastChapter: lastChapter,
        summary: summary,
        status: status,
        category: category,
        words: titleI ? TEXT(titleI) : '',
        cover: imgEl ? ATTR(imgEl, 'src') : '',
        catalog: url
    };

    // 附加书名和作者到返回对象（引擎可能不读，但方便调试）
    return JSON.stringify(book);
};

// ── 目录（含多页爬取）──────────────────────────────────
const catalog = (url) => {
    let array = [];
    let baseUrl = url;
    // 去掉可能的 #dir 锚点和尾部 /
    baseUrl = baseUrl.replace(/#.*$/, '').replace(/\/$/, '');

    // 提取 bookId（如 /51 → 51）
    let bookId = baseUrl.replace(/^\/+/, '').replace(/\/+$/, '');

    // 收集章节（用于后续分页）
    function collectPage(pageUrl) {
        let html = GET(BASE + pageUrl);
        let links = SELECT(html, '#list.dir ul > li > a');
        if (!links || links.length === 0) return;
        if (typeof links === 'string') links = [links];
        links.forEach(function (a) {
            array.push({
                name: TEXT(a),
                url: ATTR(a, 'href'),
                vip: false
            });
        });
    }

    // 第一页（收集章节 + 检查分页）
    let page1Html = GET(BASE + '/' + bookId + '/');
    let links = SELECT(page1Html, '#list.dir ul > li > a');
    if (links && links.length > 0) {
        if (typeof links === 'string') links = [links];
        links.forEach(function (a) {
            array.push({
                name: TEXT(a),
                url: ATTR(a, 'href'),
                vip: false
            });
        });
    }

    // 检查是否有更多页
    let options = SELECT(page1Html, '#pages select option');
    if (options && options.length > 1) {
        if (typeof options === 'string') options = [options];
        // 遍历其余页（跳过第一页 index-xxx 和已处理的第1页）
        for (let i = 0; i < options.length; i++) {
            let val = ATTR(options[i], 'value');
            // value 格式: "index-BOOKID" (第1页) 或 "2", "3"...
            if (!val || val.indexOf('index-') === 0) continue;
            let pageNum = parseInt(val, 10);
            if (isNaN(pageNum) || pageNum <= 1) continue;
            collectPage('/' + bookId + '/p-' + pageNum + '.html');
        }
    }

    return JSON.stringify(array);
};

// ── 章节（含多页合并）──────────────────────────────────
const chapter = (url) => {
    let allText = [];
    let currentUrl = url;

    while (currentUrl) {
        let html = GET(BASE + currentUrl);
        let conDivs = SELECT(html, '.con');
        if (!conDivs || conDivs.length === 0) break;
        if (typeof conDivs === 'string') conDivs = [conDivs];

        // 提取 .con 内所有 <p> 文本
        let paras = SELECT(conDivs[0], 'p');
        if (paras && paras.length > 0) {
            if (typeof paras === 'string') paras = [paras];
            paras.forEach(function (p) {
                let t = TEXT(p);
                if (t) allText.push(t);
            });
        } else {
            // 没有 <p> 标签，直接取 .con 文本
            let raw = TEXT(conDivs[0]);
            if (raw) allText.push(raw);
        }

        // 找下一页（分页章节：-2.html, -3.html）
        let nextLink = null;
        let prenextLinks = SELECT(html, '.prenext a');
        if (prenextLinks && prenextLinks.length > 0) {
            if (typeof prenextLinks === 'string') prenextLinks = [prenextLinks];
            for (let i = 0; i < prenextLinks.length; i++) {
                let t = TEXT(prenextLinks[i]);
                if (t === '下一页') {
                    nextLink = ATTR(prenextLinks[i], 'href');
                    break;
                }
            }
        }

        // 只在确实是分页（非下一章）时跟随
        if (nextLink && nextLink.indexOf('dir') === -1) {
            currentUrl = nextLink;
        } else {
            currentUrl = null;
        }
    }

    return allText.join('\n\n');
};

// ── Profile（暂不实现，速读谷无登录）──────────────────
const profile = () => {
    return JSON.stringify({ basic: {}, extra: [] });
};

var bookSource = JSON.stringify({
    name: "速读谷",
    url: "www.sudugu.org",
    version: 100
})
