/**
 * @file url 重写
 * @author sparklewhy@gmail.com
 */

var util = require('./util');

function rewriteUrl(url, context) {
    var customRewrite = context.urlRewrite;
    if (typeof customRewrite === 'function') {
        return customRewrite(url, context);
    }

    if (customRewrite !== true || !util.isLocalPath(url)) {
        return;
    }

    var filePath = context.filePath;
    return util.rebasePath(
        url, filePath,
        context.urlRewriteTarget || 'default'
    );
}

module.exports = exports = function (urls, match, context) {
    if (!Array.isArray(urls)) {
        urls = [urls];
    }

    urls.forEach(function (url) {
        var result = rewriteUrl(url, context);
        if (result == null || result === false) {
            return;
        }

        match = match.replace(url, result);
    });
    return match;
};
