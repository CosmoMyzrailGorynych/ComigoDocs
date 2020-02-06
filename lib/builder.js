const pug = require('pug'),
      getTree = require('@ffflorian/file-index').generateIndex,
      mdmatter = require('front-matter-markdown'),
      browserSync = require('browser-sync'),
      stylus = require('./stylus'),
      slug = require('slug');

const path = require('path'),
      fs = require('fs-extra');

const hljs = require('highlight.js');
const md = require('markdown-it')({
    html: true,
    linkify: true,
    typographer: true,
    highlight(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(lang, str).value;
            } catch (oO) {
                void 0;
            }
        }
        return ''; // use external default escaping
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
    if (node.type === 'file') {
        return path.join(path.dirname(rp), path.basename(rp, path.extname(rp)) + '.html');
    }
    return '/' + path.join(path.dirname(rp), path.basename(rp, path.extname(rp)), 'index.html');
};
const getChildren = function (dirNode, recursive) {
    const entries = [];
    for (const i in dirNode.directories) {
        const dir = dirNode.directories[i];
        entries.push(dir);
        if (recursive) {
            dir.children = getChildren(dir);
        }
    }
    for (const i in dirNode.files) {
        if (path.basename(i, path.extname(i)) !== 'index') {
            entries.push(dirNode.files[i]);
        }
    }
    return entries.map(entry => ({
        permalink: getPermalink(entry),
        title: path.basename(entry.name, path.extname(entry.name))
    })).sort((a, b) => a.title.localeCompare(b.title));
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

const outputPage = async data => {
    const rendered = templates.main(data);
    const outputDir = path.join(opts.outputDir, data.page.permalink);
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
            customData: {}
        },
        children
    });
    if (dirNode.files['index.md']) {
        const content = await fs.readFile(path.join(dirNode.fullPath, 'index.md'), {encoding: 'utf8'});
        const doc = mdmatter(content, mdOptions);
        data.page.title = doc.title || path.basename(dirNode.name, path.extname(dirNode.name));
        data.page.content = md.render(content.slice(doc.skipSize));
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
            title: doc.title || pageNode.name,
            relativePath: path.relative(opts.inputDir, pageNode.fullPath),
            toc: doc.contents,
            content: md.render(content.slice(doc.skipSize)),
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

    await outputPage(data);
    rebuildHandles[pageNode.fullPath] = pageNode;
};

const buildDocs = async options => {
    opts = options;

    const stylusPromise = stylus(opts);
    const tree = await getTree(opts.inputDir);

    // eslint-disable-next-line require-atomic-updates
    opts.navigation = getChildren(tree, true);
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
    await Promise.all([indexPage, site, stylusPromise]);
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
