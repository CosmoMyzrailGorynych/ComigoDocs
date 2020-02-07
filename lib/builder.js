const pug = require('pug'),
      getTree = require('@ffflorian/file-index').generateIndex,
      mdmatter = require('front-matter-markdown'),
      browserSync = require('browser-sync'),
      slug = require('slug');

const stylus = require('./stylus'),
      icons = require('./icons'),
      scripts = require('./scripts');

const path = require('path'),
      fs = require('fs-extra');

const buttonCode = '<button class="aCopyCodeButton"><svg width="24" height="24" role="img"><use xlink:href="/icons.svg#copy"/></svg></button>';
const hljs = require('highlight.js');
const md = require('markdown-it')({
    html: true,
    linkify: true,
    typographer: true,
    highlight(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class="hljs">${buttonCode}<code>${hljs.highlight(lang, str, true).value}</code></pre>`;
          } catch (__) {void 0;}
        }
        return `<pre class="hljs">${buttonCode}<code>${md.utils.escapeHtml(str)}</code></pre>`;
      }
});
md.use(require('markdown-it-anchor'), {
    slugify: slug
});

const {walkOverDir, slugify} = require('./utils');

var opts;
var defaultData;

const mdOptions = {
    toc: true,
    headingsAsToc: true
};
const templates = {
    main: pug.compileFile('./src/templates/main.pug')
};
const rebuildHandles = {};

const ProgressBar = require('progress');
var progress;

const getPermalink = node => {
    const rp = slugify(path.relative(opts.inputDir, node.fullPath));
    return path.join('/', path.dirname(rp), path.basename(rp, path.extname(rp)));
};
const getChildren = function (dirNode, recursive) {
    const entries = [];
    for (const i in dirNode.directories) {
        const dir = dirNode.directories[i];
        entries.push(dir);
    }
    for (const i in dirNode.files) {
        if (path.basename(i, path.extname(i)) !== 'index') {
            entries.push(dirNode.files[i]);
        }
    }
    return entries.map(entry => {
        const obj = {
            permalink: getPermalink(entry),
            title: path.basename(entry.name, path.extname(entry.name))
        };
        if (recursive && entry.type === 'directory') {
            obj.children = getChildren(entry);
        }
        return obj;
    }).sort((a, b) => a.title.localeCompare(b.title));
};
const recursivelySlugifyToc = function(toc) {
    for (const link of toc) {
        if (Array.isArray(link.title)) {
            link.title = link.title.join('');
        }
        link.hash = slug(link.title);
        if (link.contents) {
            recursivelySlugifyToc(link.contents);
        }
    }
};

// eslint-disable-next-line no-useless-escape
const linkPrettifier = /(\[[^\[\]\(\)\n]+?\]\()\.?(\S+?)(?:\/index)?(?:\.md)\)/gi;
// Also replaces links to md files with permalinks to html
const renderMd = function(string) {
    return md.render(string.replace(linkPrettifier, (match, p1, p2) => p1 + p2.toLowerCase() + ')'));
};
const outputPage = async data => {
    const rendered = templates.main(data);
    const outputDir = path.join(opts.outputDir, path.join(data.page.permalink, 'index.html'));
    await fs.outputFile(outputDir, rendered, {encoding: 'utf8'});
    if (browserSync.has('ComigoDocs')) {
        browserSync.get('ComigoDocs').reload(data.page.permalink);
    } else {
        progress.tick({file: data.page.permalink});
    }
};
const buildDirPage = async function(dirNode) {
    const children = getChildren(dirNode);
    const permalink = getPermalink(dirNode);
    const data = Object.assign({}, defaultData, {
        page: {
            relativePath: path.relative(opts.inputDir, dirNode.fullPath),
            permalink,
            customData: {},
            title: path.basename(dirNode.name, path.extname(dirNode.name)),
            hasOwnTitle: false
        },
        children
    });
    // There is a content for this directory. Render it and extract ToC.
    if (dirNode.files['index.md']) {
        const content = await fs.readFile(path.join(dirNode.fullPath, 'index.md'), {encoding: 'utf8'});
        const doc = mdmatter(content, mdOptions);
        data.page.content = renderMd(content.slice(doc.skipSize));
        data.page.hasOwnTitle = content.slice(doc.skipSize).trim()
                                .indexOf('# ') === 0;
        if (doc.contents) {
            recursivelySlugifyToc(doc.contents);
            data.page.toc = doc.contents;
        }
        // Copy the front-matter data
        for (const i in doc) {
            if (i !== 'skipSize') {
                data.page.customData[i] = doc[i];
            }
        }
    }
    await outputPage(data);
    rebuildHandles[dirNode.fullPath] = dirNode;
};
const buildSinglePage = async function(pageNode) {
    if (path.basename(pageNode.fullPath) === 'index.md') {
        // These are managed by buildDirPage
        return;
    }
    const content = await fs.readFile(pageNode.fullPath, {encoding: 'utf8'});
    const doc = mdmatter(content, mdOptions);
    const permalink = getPermalink(pageNode);
    const data = Object.assign({}, defaultData, {
        page: {
            title: path.basename(pageNode.name, path.extname(pageNode.name)),
            relativePath: path.relative(opts.inputDir, pageNode.fullPath),
            toc: doc.contents,
            content: renderMd(content.slice(doc.skipSize)),
            hasOwnTitle: content.slice(doc.skipSize).trim()
                         .indexOf('# ') === 0,
            permalink,
            customData: {}
        },
        children: []
    });

    // Copy the front-matter data
    for (const i in doc) {
        if (i !== 'skipSize') {
            data.page.customData[i] = doc[i];
        }
    }

    await outputPage(data, data.page.permalink);
    rebuildHandles[pageNode.fullPath] = pageNode;
};

const buildDocs = async options => {
    opts = options;

    const assets = Promise.all([
        stylus(opts),
        icons(opts),
        scripts(opts)
    ]);

    const tree = await getTree(opts.inputDir);

    // Get the frontmatter of the `/` page (the root `index.md` file)
    // Use its title as the name of the site.
    let indexSrc;
    try {
        indexSrc = await fs.readFile(path.join(opts.inputDir, 'index.md'));
    } catch (e) {
        console.error('There was an error reading the index.md at the root of your docs folder. It is needed to get the name of the site, and generate the `/` path of your document.');
        throw e;
    }

    const firstPageData = mdmatter(indexSrc, mdOptions);
    let title;
    if (firstPageData.contents && firstPageData.contents[0]) {
        [{title}] = firstPageData.contents;
    }

    // Generate a navigation/sitemap
    // eslint-disable-next-line require-atomic-updates
    opts.navigation = getChildren(tree, true);
    // The first link is always 'index.md'
    opts.navigation.unshift({
        title,
        permalink: '/'
    });
    defaultData = {
        site: {
            navigation: opts.navigation
        }
    };

    let total = 1; // +1 for the homepage
    // Count the number of pages to generate
    walkOverDir(tree, page => {
        if (path.basename(page.fullPath) !== 'index.md' && path.extname(page.fullPath) === '.md') {
            total++;
        }
    }, () => {
        total++;
    });

    progress = new ProgressBar(':bar [:current/:total] Writing :file', {
        complete: '█',
        incomplete: '░',
        total,
        curr: 0,
        //clear: true,
        width: 20
    });

    const indexPage = buildDirPage(tree);
    const site = walkOverDir(tree, buildSinglePage, buildDirPage);
    await Promise.all([indexPage, site, assets]);
};

buildDocs.rebuildPage = function(fullPath) {
    if (!(fullPath in rebuildHandles)) {
        return;
    }
    if (path.basename(fullPath) === 'index.md') {
        buildDirPage(rebuildHandles[fullPath]);
    } else {
        buildSinglePage(rebuildHandles[fullPath]);
    }
};

module.exports = buildDocs;
