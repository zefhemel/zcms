/*global _*/
var fs = require("zed/fs");
var session = require("zed/session");

var Handlebars = require("./handlebars");
var pagedown = require("./pagedown");

var contentPrefix  = "/content/";
var templatePrefix = "/template/";
var outPrefix = "/out/";

var allTemplates;
var allPages;

Handlebars.registerHelper('call-template', function(templateName, options) {
    var templateFrame = Handlebars.createFrame(options.data || {});
    _.extend(templateFrame, options.hash, {
        content: options.fn(this)
    });
    return new Handlebars.SafeString(allTemplates[templateName](templateFrame));
});

Handlebars.registerHelper('markdown', function(str) {
    var converter = new pagedown.Converter();
    return new Handlebars.SafeString(converter.makeHtml(str));
});

Handlebars.registerHelper('list-pages', function(regex) {
    var pages = [];
    var r = regex ? new RegExp(regex) : /.*/;
    _.each(allPages, function(page) {
        if(r.exec(page.url)) {
            pages.push(page);
        }
    });
    return pages;
});

Handlebars.registerHelper('eq', function(val, options) {
    var to = options.hash.to;
    return val === to;
});


Handlebars.registerHelper('list-pages', function(regex) {
    var pages = [];
    var r = regex ? new RegExp(regex) : /.*/;
    _.each(allPages, function(page) {
        if(r.exec(page.url)) {
            pages.push(page);
        }
    });
    return pages;
});

Handlebars.registerHelper('sort', function(list, options) {
    var by = options.hash.by;
    var reverse = !!options.hash.reverse;
    return list.sort(function(el1, el2) {
        if(reverse) {
            return el1[by] < el2[by] ? 1 : -1;
        } else {
            return el1[by] < el2[by] ? -1 : 1;
        }
    });
});

Handlebars.registerHelper('limit', function(list, options) {
    var count = options.hash.count;
    return list.slice(0, count);
});

function loadTemplates() {
    return fs.listFiles().then(function(files) {
        var templateFiles = files.filter(function(path) {
            return path.indexOf(templatePrefix) === 0 && path.indexOf(".html") !== -1;
        });

        return Promise.all(templateFiles.map(function(path) {
            return fs.readFile(path).then(function(text) {
                return {
                    path: path,
                    text: text
                };
            });
        }));
    }).then(function(templates) {
        allTemplates = {};
        templates.forEach(function(tpl) {
            allTemplates[tpl.path.slice(templatePrefix.length)] = Handlebars.compile(tpl.text);
        });
    });
}

var tagRegex = /(\w+):\s([^\n]+)/;

function parsePage(path, text) {
    var lines = text.split("\n");
    var title, content, tags = {};
    if (lines[1] && lines[1].indexOf("===") === 0) {
        title = lines[0].trim();
        var idx = 2;
        var match;
        while((match = tagRegex.exec(lines[idx])) !== null) {
            tags[match[1]] = match[2];
            idx++;
        }
        content = lines.slice(idx).join("\n");
    }
    var cleanPath = path.slice(contentPrefix.length);
    return _.extend({
        title: title,
        content: content,
        sourcePath: cleanPath,
        url: outUrl(cleanPath)
    }, tags);
}

function outPath(cleanPath) {
    if(cleanPath === 'index.md') {
        return outPrefix + 'index.html';
    } else {
        return outPrefix + cleanPath.replace(/\.md/, "/index.html");
    }
}

function outUrl(cleanPath) {
    if(cleanPath === 'index.md') {
        return "/";
    } else {
        return "/" + cleanPath.replace(/\.md/, "");
    }
}

function loadPages() {
    return fs.listFiles().then(function(files) {
        var contentFiles = files.filter(function(path) {
            return path.indexOf(contentPrefix) === 0 && path.indexOf(".md") !== -1;
        });

        return Promise.all(contentFiles.map(function(path) {
            return fs.readFile(path).then(function(text) {
                return parsePage(path, text);
            });
        }));
    }).then(function(pages) {
        allPages = {};
        pages.forEach(function(page) {
            allPages[page.sourcePath] = page;
        });
    });
}

function findTemplate(path) {
    var pathParts = path.split('/');
    var exactTemplate = path.replace(/\.md$/, ".html");
    if(allTemplates[exactTemplate]) {
        return allTemplates[exactTemplate];
    }
    for (var i = pathParts.length - 1; i >= 0; i--) {
        var prefix = pathParts.slice(0, i).join('/');
        var templatePath = prefix ? prefix + "/template.html" : "template.html";
        if (allTemplates[templatePath]) {
            return allTemplates[templatePath];
        }
    }
}

function generatePage(path, content) {
    var cleanPath = path.slice(contentPrefix.length);
    var template = findTemplate(cleanPath);
    if (!template) {
        return console.error("Could not find template for", path);
    }
    var page = allPages[cleanPath];
    if(typeof content === 'string') {
        page = parsePage(path, content);
    }
    var html = template(_.extend({url: outUrl(cleanPath)}, page));
    return fs.writeFile(outPath(cleanPath), html).then(function() {
        console.log("File", outPath(cleanPath), "generated");
    });
}

function copyFiles(files) {
    return Promise.all(files.map(function(path) {
        return fs.readFile(path, true).then(function(content) {
            return fs.writeFile(outPrefix + '/' + path.split('/').slice(2).join('/'), content, true);
        });
    }));
}

function generateAll() {
    return fs.listFiles().then(function(files) {
        var filesToGenerate = files.filter(function(path) {
            return path.indexOf(contentPrefix) === 0 && path.indexOf(".md") !== -1;
        });
        var filesToCopy = files.filter(function(path) {
            return (path.indexOf(templatePrefix) === 0 || path.indexOf(contentPrefix) === 0) && path.indexOf(".html") === -1 && path.indexOf(".md") === -1;
        });
        return Promise.all(filesToGenerate.map(generatePage).concat([copyFiles(filesToCopy)]));
    });
}

module.exports = function(info) {
    loadTemplates().then(loadPages).then(function() {
        switch (info.action) {
            case 'generate-full':
                session.flashMessage(info.path, "Generating all", 500);
                return generateAll().then(function() {
                    session.flashMessage(info.path, "Done", 500);
                });
            case 'generate':
                return generatePage(info.path, info.inputs.text).then(function() {
                    session.flashMessage(info.path, "Regenerated", 500);
                });
        }
    }).
    catch (function(err) {
        console.error("Error", err.message, err.stack);
        throw err;
    });
};
