/**
 * @file pug 模板编译器
 * @author sparklewhy@gmail.com
 */

var assign = require('object-assign');
var helper = require('./helper');

/**
 * 编译代码
 *
 * @param {string} data 要编译的代码数据
 * @param {string} filePath 代码所属的文件路径
 * @param {?Object} options 编译的选项
 * @param {Object=} options.pug pug 编译选项
 * @param {boolean|Object} sourceMap 是否输出 source map，或者之前输出的 source map
 * @return {string}
 */
function compile(data, filePath, options, sourceMap) {
    var pug = compile.getParser();

    options || (options = {});
    var opts = assign(
        {
        },
        exports.DEFAULT_OPTIONS || {},
        options.pug || {}
    );

    return pug.compile(data, opts)();
}

compile.getParser = function () {
    return helper.requireParser(compile, 'pug', 'pug');
};

module.exports = exports = compile;

exports.DEFAULT_OPTIONS = null;
