/**
 * @file vue 模板编译
 * @author sparklewhy@gmail.com
 */

var hash = require('hash-sum');
var util = require('./util');
var urlRewriteProcessor = require('./url-rewriter');
var htmlParser = require('./html-url-parser');
var cache = require('lru-cache')(100);
var assign = require('object-assign');

var DEFAULT_TRANSFORM_ELEMENTS = {
    img: 'src',
    source: 'srcset'
};

function handleTplUrlRewrite(context, found) {
    return urlRewriteProcessor(found.value, found.match, context);
}

function rewriteTplResourceUrl(content, transformEle, context) {
    if (!transformEle || !Object.keys(transformEle).length) {
        return content;
    }
    var rewriter = handleTplUrlRewrite.bind(this, context);
    Object.keys(transformEle).forEach(function (tag) {
        content = htmlParser.parseTagAttr(
            content, tag, transformEle[tag], rewriter
        );
    });
    return content;
}

/**
 * 编译 VUE 的模板
 *
 * @param {string} filePath 模板所在文件路径
 * @param {string} template 要编译的模板
 * @param {Object} opts 编译选项
 * @param {string} opts.id 编译文件 id
 * @param {boolean} opts.scoped 是否使用 scoped 样式
 * @param {Object|boolean=} opts.transformEle 要转换处理的元素，可选，默认 img.src,source.srcset
 * @param {Function=} opts.nodeRewrite 要转换元素的处理方法，可选，默认只是本地路径重写
 * @param {boolean|Function=} opts.urlRewrite 是否进行 url 重写，或者自定义的重写方法，可选
 * @param {string=} opts.urlRewriteTarget url 路径重写的目标文件路径
 * @param {boolean=} opts.compileToRender 是否把模板编译成 render 函数，可选，默认 true
 * @param {Function=} opts.preprocessor 自定义的模板的预处理器，可选
 * @return {Object}
 */
module.exports = function (filePath, template, opts) {
    var id = opts.id;
    var key = hash(id + '!!' + template + (opts.scoped ? 1 : 0));
    var val = cache.get(key);
    if (val) {
        return val;
    }

    opts = assign({}, opts);
    var transformEle = opts.transformEle;
    if (transformEle !== false) {
        (transformEle = opts.transformEle = assign(
            {},
            DEFAULT_TRANSFORM_ELEMENTS,
            (transformEle === true || !transformEle) ? {} : transformEle
        ));
    }

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
        urlRewriteTarget: opts.urlRewriteTarget
    };

    if (typeof opts.preprocessor === 'function') {
        template = opts.preprocessor(filePath, template, opts);
    }

    template = rewriteTplResourceUrl(template, transformEle, context);

    var result;
    if (opts.compileToRender === false) {
        result = {code: template, deps: context.deps};
    }
    else {
        context.content = template;
        result = opts.compileToRender(context, opts);
    }

    cache.set(key, result);

    return result;
};


