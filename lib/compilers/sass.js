/**
 * @file sass 样式编译器 版本要求 3 以上
 * @author sparklewhy@gmail.com
 */

var assign = require('object-assign');
var path = require('path');
var helper = require('./helper');

/**
 * 编译代码
 *
 * @param {string} data 要编译的代码数据
 * @param {string} filePath 代码所属的文件路径
 * @param {?Object} options 编译的选项
 * @param {Object=} options.sass sass 编译选项
 * @param {boolean|Object} sourceMap 是否输出 source map，或者之前输出的 source map
 * @return {{code: string, map: ?string, deps: ?Array.<string>}}
 */
function compile(data, filePath, options, sourceMap) {
    var sass = compile.getParser();

    options || (options = {});
    var opts = assign(
        {
            sourceComments: true,
            sourceMap: !!sourceMap,
            // enable source map, out file option is required,
            // attention it will not write to this out file
            outFile: 'output/' + filePath,
            data: data
        },
        exports.DEFAULT_OPTIONS || {},
        options.sass || {}
    );

    // init import search paths
    var dir = path.dirname(filePath);
    var paths = [dir, process.cwd()];
    opts.includePaths = opts.includePaths
        ? opts.includePaths.concat(paths)
        : paths;

    if (!sass.renderSync) {
        throw 'require node-sass > 3.0.0';
    }

    var res = sass.renderSync(opts);
    var result = {};
    if (sourceMap) {
        result.map = res.map.toString();
    }

    result.deps = res.stats.includedFiles || [];
    result.code = res.css.toString();

    return result;
}

compile.getParser = function () {
    return helper.requireParser(compile, 'sass', 'node-sass');
};

module.exports = exports = compile;

exports.DEFAULT_OPTIONS = null;
