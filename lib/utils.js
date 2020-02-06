/**
 * Applies functions to all the nodes in the given tree,
 * handling synchronous and promisified tasks.
 * It **does not** call the onDir on the passed node.
 * @param {object} node The starting node.
 * @param {Function} onFile The function to call with a file node as its only argument.
 * @param {Function} onDir The function to call with a directory node as its only argument.
 * @returns {Promise<void>} This method always returns a Promise.
 */
const walkOverDir = async function(node, onFile, onDir) {
    const promises = [];
    if (node.type !== 'directory') {
        throw new Error('Not a directory, ', node);
    }
    for (const dirName in node.directories) {
        const dirsResult = walkOverDir(node.directories[dirName], onFile, onDir);
        const result = onDir(node.directories[dirName]);
        if (result instanceof Promise) {
            promises.push(result);
        }
        if (dirsResult instanceof Promise) {
            promises.push(dirsResult);
        }
    }
    for (const fileName in node.files) {
        const result = onFile(node.files[fileName]);
        if (result instanceof Promise) {
            promises.push(result);
        }
    }
    if (promises.length) {
        await Promise.all(promises);
    }
};

const slug = require('slug');

const slugify = string =>
    string.trim().toLowerCase()
          .replace(/\.md$/, '')
          .split('/')
          .map(elt => slug(elt))
          .join('/');

module.exports = {
    walkOverDir,
    slugify
};
