/**
 * @file 编译助手方法
 * @author sparklewhy@gmail.com
 */

var requireModule = require('../require');

module.exports = exports = {};

/**
 * 获取编译器 parser
 *
 * @param {Object} compiler 编译器
 * @param {string|Array.<string>} name 要使用的依赖名称
 * @param {string|Array} deps 具体依赖清单
 * @return {*}
 */
exports.requireParser = function (compiler, name, deps) {
    if (compiler.parser) {
        return compiler.parser;
    }

    requireModule.ensure(name, deps);
    return requireModule(Array.isArray(deps) ? deps[0] : deps);
};
