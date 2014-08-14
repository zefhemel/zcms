var http = require("zed/http");
var fs = require("zed/fs");
var ui = require("zed/ui");

var mimeTypes = require("./mime_types");
var prefix = "/out";

function getContentType(path) {
    var parts = path.split('.');
    var ext = parts[parts.length-1];
    return mimeTypes[ext] || "application/octet-stream";
}

function requestHandler(req) {
    var path = req.path;
    // console.log("Request", req);
    return fs.readFile(prefix + path, true).then(function(content) {
        return {
            status: 200,
            headers: {
                "Content-Type": getContentType(path)
            },
            body: content
        };
    }, function() {
        // We'll assume a not found error. Let's try one more thing: adding /index.html to the end
        if (path[path.length - 1] === "/") {
            path = path.substring(0, path.length - 1);
        }

        return fs.readFile(prefix + path + "/index.html", true).then(function(content) {
            return {
                status: 200,
                headers: {
                    "Content-Type": "text/html"
                },
                body: content
            };
        }, function() {
            return {
                status: 404,
                headers: {
                    "Content-Type": "text/plain"
                },
                body: "Not found"
            };
        });
    });
}

module.exports = function(info) {
    switch(info.action) {
        case 'start':
            http.startServer("zcms", "ZCMS:Web Request").then(function(url) {
                console.log("Listening on", url);
                ui.openUrl(url);
            });
            break;
        case 'request':
            return requestHandler(info.request);
        case 'stop':
            http.stopServer("zcms");
            break;
    }
};
