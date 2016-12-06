/**
 * @file vue 模板编译
 * @author sparklewhy@gmail.com
 */

var hash = require('hash-sum');
var util = require('./util');
var urlRewriteProcessor = require('./url-rewriter');
var htmlParser = require('./html-url-parser');
var cache = require('lru-cache')(100);

function handleTplUrlRewrite(context, found) {
    return urlRewriteProcessor(found.value, found.match, context);
}

function rewriteTplResourceUrl(context) {
    var rewriter = handleTplUrlRewrite.bind(this, context);
    var result = htmlParser.parseImgUrl(context.content, rewriter);
    result = htmlParser.parsePictureSourceUrl(result, rewriter);
    return result;
}

/**
 * 编译 VUE 的模板
 *
 * @param {string} filePath 模板所在文件路径
 * @param {string} template 要编译的模板
 * @param {Object=} opts 编译选项
 * @param {Object=} opts.transformEle 要转换处理的元素，可选，默认 img.src
 * @param {Function=} opts.nodeRewrite 要转换元素的处理方法，可选，默认只是本地路径重写
 * @param {boolean|Function=} opts.urlRewrite 是否进行 url 重写，或者自定义的重写方法，可选
 * @param {string=} opts.urlRewriteTarget url 路径重写的目标文件路径
 * @param {boolean=} opts.compileToRender 是否把模板编译成 render 函数，可选，默认 true
 * @param {Function=} opts.postTemplate 自定义的模板的后处理器，编程成非 render 时有效，可选
 * @return {Object}
 */
module.exports = function (filePath, template, opts) {
    opts || (opts = {});

    var context = {
        filePath: filePath,
        content: template,
        deps: [],
        resolvePath: function (url) {
            return util.resolvePath(url, filePath);
        },
        rebasePath: function (url, rebaseTargetFile) {
            return util.rebasePath(url, filePath, rebaseTargetFile);
        },
        urlRewrite: opts.urlRewrite,
        urlRewriteTarget: opts.urlRewriteTarget,
        htmlParser: htmlParser,
        urlRewriteProcessor: urlRewriteProcessor
    };

    if (opts.compileToRender === false) {
        template = rewriteTplResourceUrl(context);

        if (typeof opts.postTemplate === 'function') {
            var id = opts.id;
            var key = hash(id + '!!' + template + (opts.scoped ? 1 : 0));
            var val = cache.get(key);
            if (!val) {
                template = opts.postTemplate(filePath, template, opts);
                cache.set(key, template);
            }
            else {
                template = val;
            }
        }
        return {code: template};
    }

    return opts.compileToRender(context, opts);
};


