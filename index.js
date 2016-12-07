/**
 * @file 入口模块
 *       基于 https://github.com/vuejs/vueify 修改
 * @author sparklewhy@gmail.com
 */

module.exports = exports = require('./lib/loader');

/**
 * 注册自定义的 parser
 * register('less', parser, optionalDefaultOptions);
 * register(
 *    {
 *        less: parser,
 *        stylus: [parser, optionalDefaultOptions]
 *    }
 * )
 *
 * @param {...*} args 自定义的 parser
 */
exports.registerParser = function (args) {
    var parserMap = args;
    if (arguments.length >= 2) {
        parserMap = {};

        if (arguments[2]) {
            parserMap[arguments[0]] = [
                arguments[1],
                arguments[2]
            ];
        }
        else {
            parserMap[arguments[0]] = arguments[1];
        }
    }

    var compiler = exports.compiler;
    Object.keys(parserMap).forEach(function (name) {
        var found = compiler.find(name);
        if (!found) {
            throw new Error(name + ' is not builtin compiler type');
        }

        var result = parserMap[name];
        if (Array.isArray(result)) {
            found.parser = result[0];
            result[1] && (found.DEFAULT_OPTIONS = result[1]);
        }
        else {
            found.parser = result;
        }
    });
};

/**
 * 注册 FIS Parser，避免使用不同版本的 parser 及重复安装，要求注册的 parser 需要
 * 导出 parser/DEFAULT_OPTIONS(可选) 属性
 *
 * @param {Object} fis fis 实例
 * @param {Object} parserMap 要注册的 parser map，key: 为 compiler name,
 *        value 为对应的 fis parser name, e.g., {stylus: 'stylus', less: 'less2'}
 */
exports.registerFisParser = function (fis, parserMap) {
    var compiler = exports.compiler;
    // var parserMap = {
    //     stylus: 'stylus',
    //     less: 'less2'
    // };
    Object.keys(parserMap).forEach(function (name) {
        var found = compiler.find(name);
        var parserName = parserMap[name];

        if (found) {
            try {
                var fisParser = parserName.indexOf('parser-') === -1
                    ? fis.require('parser', parserName)
                    : fis.require(parserName);
                if (fisParser && fisParser.parser) {
                    found.parser = fisParser.parser;
                    fisParser.DEFAULT_OPTIONS
                    && (found.DEFAULT_OPTIONS = fisParser.DEFAULT_OPTIONS);
                }
                else {
                    fis.log.info(
                        'fis parser %s is not export parser instance', parserName
                    );
                }
            }
            catch (ex) {
                fis.log.warn('try find fis parser fail: %s', parserName);
            }
        }
    });
};
