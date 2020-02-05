const pug = require('pug'),
      stylus = require('stylus'),
      getTree = require('@ffflorian/file-index').generateIndex,
      md = require('front-matter-markdown');

const path = require('path'),
      fs = require('fs-extra');

const mdOptions = {
    content: true,
    headingsAsToc: true
};
const opts = {
    docsPath: './docs',
    outputPath: './dist'
};
const templates = {
    main: pug.compileFile('./src/templates/main.pug')
};

const walkOverDir = function(node, onFile, onDir) {
    if (node.type !== 'directory') {
        throw new Error('Not a directory, ', node);
    }
    for (const dirName in node.directories) {
        onDir(node.directories[dirName]);
    }
    for (const fileName in node.files) {
        onFile(node.files[fileName]);
    }
};

const getResultingPermalink = node => {
    const rp = path.relative(opts.docsPath, node.fullPath);
    if (node.type === 'file') {
        return path.join(path.dirname(rp), path.basename(rp, path.extname(rp)) + '.html');
    }
    return path.join(path.dirname(rp), path.basename(rp, path.extname(rp)), 'index.html');
};
const getChildren = function (dirNode) {
    const entries = [];
    for (const i in dirNode.directories) {
        entries.push(dirNode.directories[i]);
    }
    for (const i in dirNode.files) {
        if (path.basename(i, path.extname(i)) !== 'index') {
            entries.push(dirNode.files[i]);
        }
    }
    return entries.map(entry => ({
        permalink: getResultingPermalink(entry),
        title: entry.name
    })).sort((a, b) => a.title.localeCompare(b.title));
};

const buildDirPage = async function(dirNode) {
    const children = getChildren(dirNode);
    const permalink = getResultingPermalink(dirNode);
    const data = {
        page: {
            relativePath: path.relative(opts.docsPath, dirNode.fullPath),
            permalink,
            customData: {}
        },
        children,
        site: {}
    };
    if (dirNode.files['index.md']) {
        const content = await fs.readFile(path.join(dirNode.fullPath, 'index.md'), {encoding: 'utf8'});
        const doc = md(content, mdOptions);
        data.page.title = doc.title || dirNode.name;
        data.page.toc = doc.contents;
        data.page.content = doc.$compiled;
        // Copy the front-matter data
        for (const i in doc) {
            if (i !== skipSize) {
                data.page.customData[i] = doc[i];
            }
        }
    }

    const rendered = templates.main(data);
    const outputPath = path.join(opts.outputPath, permalink)
    fs.outputFile(outputPath, rendered, {encoding: 'utf8'});

    console.log(`Rendered page ${outputPath}`);
};
const buildSinglePage = async function(pageNode) {
    if (path.basename(pageNode.fullPath) === 'index.md') {
        // These are managed by buildDirPage
        return;
    }
    const content = await fs.readFile(pageNode.fullPath, {encoding: 'utf8'});
    const doc = md(content, mdOptions);
    const permalink = getResultingPermalink(pageNode);
    const data = {
        page: {
            title: doc.title || pageNode.name,
            relativePath: path.relative(opts.docsPath, pageNode.fullPath),
            toc: doc.contents,
            content: doc.$compiled,
            permalink,
            customData: {}
        },
        children: [],
        site: {}
    };
    // Copy the front-matter data
    for (const i in doc) {
        if (i !== 'skipSize') {
            data.page.customData[i] = doc[i];
        }
    }
    console.log(doc.contents);

    const rendered = templates.main(data);
    const outputPath = path.join(opts.outputPath, permalink)
    fs.outputFile(outputPath, rendered, {encoding: 'utf8'});

    console.log(`Rendered page ${outputPath}`);
};

const buildDocs = async () =>
    getTree(opts.docsPath)
    .then(tree => {
        const buildDirWithWalk = dirNode => {
            buildDirPage(dirNode);
            walkOverDir(dirNode, buildSinglePage, buildDirWithWalk);
        }
        walkOverDir(tree, buildSinglePage, buildDirWithWalk);
    });
buildDocs();