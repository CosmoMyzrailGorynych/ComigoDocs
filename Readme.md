# ComigoDocs

ComigoDocs is an open-source documentation/static site generator. It aims to require 0 configs, and reduce the bullshit required to get a working, fully functional site with minimal maintenance in sense of updating its content.

Docs are generated from a folder of `.md` file (Markdown documents). Each `.md` file becomes a page, and folders with other files and folders will have one as well, with a nice listing of child pages. If you put an `index.md` file inside a folder, its content will be shown on the top of the folder's children listing. This all allows you to freely define structure: it may be flat, it can be one book with chapters split into parts, it can be a stack of such books, or any mixed variant. The only restriction is your imagination, which is the maximum call stack for a recursive function in js. (500 levels, I guess?)

## This all is a WIP, though

But to test it, clone the repo, and run:

```sh
npm install
npm link
comigodocs serve
```

## TODO

* a full-site search based on headings;
* a downloadable PDF version;
* easy copy for code blocks;
* automagic dark theme + the ability to pass a custom theme in query parameters (that's what I need for ct.js);
* configs to control layout for different pages; rn you can only set a `title` in the front matter of an `.md` file.