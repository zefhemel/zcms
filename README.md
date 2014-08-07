ZCMS
====

ZCMS is a simple static site generator implemented as a [Zed](http://zedapp.org) package. It is used to generate the [Zed](http://zedapp.org) website (source can be found [here](http://github.com/zedapp/website)).

Project structure
-------

To setup a ZCMS project create an empty directory with a `zedconfig.json` file in it that contains the following:

    {
        "preferences": {
            "gotoExclude": ["/out/*"]
        },
        "packages": ["gh:zefhemel/zcms"]
    }

Note that you won't have to install ZCMS explicitly, Zed will automatically download and activate it when you open the directory with the `zedconfig.json` file you just created.

### `/content`
All content files for your site should have a `/content` prefix in their path. `/content/index.md` is the root of the site. All markdown (`.md`) files will be automatically processed and translated to HTML. Any other file (images etc.) will simply be copied to the output directory (`/out`).

### `/template`
Templates and template related files (stylesheets, javascripts, images) are stored under the `/template` prefix. `/template/template.html` is the root template used for all pages in `/content` _unless_ there's a better match found.

A better template match can either be a `.html` file that mirrors a `.md` path in `/content` exactly (e.g. `/content/blog.md` and `/content/blog.html`), or a `template.html` file that's located in a prefix under `/template` that matches the `/content` path's prefix. For instance, if there exists a `/template/blog/template.html` this template will be applied to all pages under `/content/blog` (unless there's an even _more_ specific match).

Content
-------

Content in files ending with `.md` is written using [Markdown](http://daringfireball.net/projects/markdown/) and translated to HTML using [PageDown](https://code.google.com/p/pagedown/). Every piece of content written in Markdown should have the following basic structure:

    Page Title
    ==========
    tag1: tag value
    tag2: tag value

    Content *here*

The tags are optional and can be used to e.g. sort pages (see "Templates" below). Internally a simple data structure will built from this that looks as follows (this is useful to know for templating):

    {
        title: "Page Title",
        tag1: "tag value",
        tag2: "tag value",
        content: "Content *here*"
    }

Templates
---------
Templates have filenames ending with `.html` and are written using [Handlebars](http://handlebarsjs.com/). In addition to Handlebar built-ins, the following extra helpers are available:

* `call-template`: Can be used to call (import) another template (paths are always from the root of `/template`), context can be passed on via key/value pairs. The body is passed on as `content`.

    Example:

        {{#call-template "base.html" title=title}}
        <h1>{{ title }}</h1>
        {{markdown content}}
        {{/call-template}}

    where `/template/base.html` is:

        <html>
        <head>
            <title>{{ title }}</title>
        </head>
        <body>
        {{ content }}
        </body>
        </html>

* `markdown`: used to translate a piece of markdown to HTML. Example:

        {{ markdown "This *is* cool" }}
* `list-pages`: takes optional regex to match pages, example used in combination with `sort` and `limit` (see below):

        {{#each (limit (sort (list-pages "/blog/.*") by="date" reverse=true) count=5)}}
            <li>{{title}}</li>
        {{/each}}

* `eq`: checks two values for equality, example: `eq val to=val2`
* `sort`: sorts a list (e.g. coming from `list-pages`) based on a key, optionally in reverse order, example `sort (list-pages) by="date" reverse=true`
* `limit`: takes first _n_ elements from a list, example: `list (list-pages) count=5`

Generating the site
========

To generate the full site (generate HTML from Markdown and copy files from templates and content such as images) run the `ZCMS:Generate Full Site` command or press `Ctrl-Shift-C`, check the `zed::log` document for debug output and errors.

Output is generated into the `/out` directory, which is not visible from within Zed, but is available on the file system.

Individual pages are regenerated as you edit them (do note that changing templates will require you to regenerate the full site).

To view the site, use a simple static file-serving capable server. For instance, if you have Python installed:

    cd out
    python -m SimpleHTTPServer

Gotchas
-------

If you copy and paste new files (e.g. images) into `/content` or `/template` note that Zed will only copy these when regenerating the site if they're visible in Zed's file list. That is: you probably need to reload the file list (`Ctrl-R`) for them to be copied during the next generation cycle.

Also note that there's a slight delay in Zed saving files, that means that if you make a change in a template and _immediately_ regenerate the full site, it's possible that your changes weren't persisted yet. Be a little bit patient.

Samples?
--------

Checkout the [source code for zedapp.org](https://github.com/zedapp/website) for a sample site built using ZCMS.
