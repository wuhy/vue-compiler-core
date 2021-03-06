/**
 * @file babel 编译器
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var path = require('path');
var assign = require('object-assign');
var json5 = require('json5');
var util = require('../util');
var helper = require('./helper');
var requireModule = require('../require');

/**
 * 读取 babel 配置
 *
 * @return {?Object}
 */
function readBabelConfig() {
    var babelRcFile = path.resolve(process.cwd(), '.babelrc');
    if (util.isPathExists(babelRcFile)) {
        return json5.parse(fs.readFileSync(babelRcFile, 'utf-8'));
    }

    var pkgFile = path.resolve(process.cwd(), 'package.json');
    if (util.isPathExists(pkgFile)) {
        return require(pkgFile).babel;
    }
}

var speeded = false;

/**
 * 编译代码
 *
 * @param {string} data 要编译的代码数据
 * @param {string} filePath 代码所属的文件路径
 * @param {?Object} options 编译的选项
 * @param {Object=} options.babel babel 编译选项
 * @param {boolean|Object} sourceMap 是否输出 source map，或者之前输出的 source map
 * @return {{code: string, map: ?Object}}
 */
function compile(data, filePath, options, sourceMap) {
    var babel = compile.getParser(options);

    options || (options = {});
    var opts = assign(
        {
            comments: false,
            filename: filePath,
            sourceMaps: !!sourceMap,
            inputSourceMap: typeof sourceMap === 'object'
                ? sourceMap : null
        },
        exports.DEFAULT_OPTIONS || {},
        readBabelConfig() || {},
        options.babel || {}
    );

    var qrequire;
    if (!speeded && options.speed) {
        speeded = true;
        qrequire = requireModule('qrequire');
        qrequire.hook();
    }

    var result = babel.transform(data, opts);

    qrequire && qrequire.unhook();

    return result;
}

compile.getParser = function (options) {
    var deps = ['babel-core'];
    if (options && options.speed) {
        deps.push('qrequire');
    }
    return helper.requireParser(compile, 'babel', deps);
};

module.exports = exports = compile;

exports.DEFAULT_OPTIONS = null;
