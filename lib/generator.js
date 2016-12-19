/**
 * @file vue 组件编译后代码生成器
 * @author sparklewhy@gmail.com
 */

var path = require('path');
var hash = require('hash-sum');
var SourceMap = require('source-map');
var util = require('./util');

var STYLE_MODULE_VAR_NAME = '__fisx_style_dispose__';

function getCode(part) {
    var output = part && part.output;
    if (typeof output !== 'string') {
        output && (output = output.code);
    }
    return output || '';
}

function getInsertCssModuleId(insertCssLibDir) {
    var pkgName = require('../package.json').name;
    var id = path.join(pkgName, 'lib', 'insert-css');

    if (insertCssLibDir) {
        id = path.join(insertCssLibDir, id);
    }

    return util.normalizePath(id);
}

function getHotReloadApiModuleId(hotReloadApiDir) {
    return util.normalizePath(hotReloadApiDir);
}

/**
 * 输出 source map 文件名
 *
 * @param {string} filePath 文件路径
 * @param {string} content 文件内容
 * @return {string}
 */
function generateSourceMapFileName(filePath, content) {
    return path.basename(filePath)
        + '?' + hash(filePath + content);
}

function generateCodeSourceMap(filePath, content, generated, offsetLineNum, options) {
    if (typeof options === 'boolean') {
        options = {};
    }
    var hashedFilename = options.file || generateSourceMapFileName(filePath, content);
    var map = new SourceMap.SourceMapGenerator({
        file: options.file,
        sourceRoot: options.sourceRoot
    });
    map.setSourceContent(hashedFilename, content);
    // map._hashedFilename = hashedFilename;

    if (!generated.output) {
        return map;
    }

    var inMap = generated.output.map;
    if (!inMap) {
        return map;
    }

    var inMapConsumer = new SourceMap.SourceMapConsumer(inMap);
    var generatedOffset = offsetLineNum + 1;
    inMapConsumer.eachMapping(function (m) {
        if (!m.originalLine) {
            return;
        }
        map.addMapping({
            source: hashedFilename,
            generated: {
                line: m.generatedLine + generatedOffset,
                column: m.generatedColumn
            },
            original: {
                line: m.originalLine,
                column: m.originalColumn
            }
        });
    });
    return map;
}

function generateStyle(source, options) {
    var styles = source.styles;
    if (options.isServer || !styles || !styles.length) {
        return;
    }

    var styleCode = [];
    styles.forEach(function (item, index) {
        styleCode[index] = getCode(item);
    });
    styleCode = styleCode.join('\n');

    var filePath = source.filePath;
    var result = {
        filePath: filePath,
        raw: styles,
        content: styleCode
    };

    if (!options.extractStyle) {
        var insertCSSPath = exports.generateInsertCssPath(options);
        result.output = 'var ' + STYLE_MODULE_VAR_NAME + ' = require("'
            + insertCSSPath + '").insert(' + JSON.stringify(styleCode) + ')\n';
        result.lineNum = 1;
    }

    return result;
}

function generateScript(source, offsetLineNum, options) {
    var script = source.script;
    if (!script) {
        return;
    }

    var code = getCode(script);
    var map = null;
    var filePath = source.filePath;
    if (options.sourceMap) {
        map = generateCodeSourceMap(
            filePath, source.content, script, offsetLineNum, options.sourceMap
        );
    }

    var generated = ';(function(){\n' + code + '\n})();\n';

    // babel 6 compat
    generated += 'var __exported__ = module.exports.__esModule ? module.exports.default : module.exports;\n';
    // in case the user exports with Vue.extend
    generated += 'var __vue__options__ = (typeof __exported__ === "function"'
        + '? __exported__.options'
        + ': __exported__)\n';

    return {
        filePath: filePath,
        raw: script,
        content: code,
        output: generated,
        map: map
    };
}

function generateTemplate(source, map, options) {
    var template = source.template;
    if (!template) {
        return;
    }

    var generated = '';
    if (!options.isProduction && !options.isServer) {
        generated += 'if (__vue__options__.functional) {console.error("'
            + '[fisx-vue] functional components are not supported and '
            + 'should be defined in plain js files using render functions.'
            + '")}\n';
    }

    if ((options.template || {}).compileToRender === false) {
        generated += '__vue__options__.template = '
            + JSON.stringify(getCode(template)) + '\n';
    }
    else {
        generated += '__vue__options__.render = ' + template.output.render + '\n'
            + '__vue__options__.staticRenderFns = ' + template.output.staticRenderFns
            + '\n';
    }

    return {
        filePath: source.filePath,
        raw: template,
        content: template.output,
        output: generated,
        map: map
    };
}

function generateHotReloadCode(source, changeInfo, options) {
    var hotReloadAPIPath = exports.generateHotReloadAPIPath(
        options
    );
    var hasStyle = source.styles && source.styles.length;
    var id = source.id;

    var disposeStyleCode = hasStyle && !options.extractStyle
        ? '  module.hot.dispose(' + STYLE_MODULE_VAR_NAME + ')\n'
        : '';

    var updateCode;
    var customUpdateCode = options.hotReloadUpdateCode;
    if (typeof customUpdateCode === 'function') {
        updateCode = customUpdateCode(id);
    }
    else if (customUpdateCode) {
        updateCode = customUpdateCode;
    }
    else {
        updateCode = changeInfo.scriptChanged
            ? '    hotAPI.reload("' + id + '", __vue__options__)\n'
            : (changeInfo.templateChanged
            ? '    hotAPI.rerender("' + id + '", __vue__options__)\n'
            : '');
    }

    var codes = [
        'if (module.hot) {(function () {',
        '  var hotAPI = require("' + hotReloadAPIPath + '")\n',
        '  hotAPI.install(require("vue"), false)\n',
        '  if (!hotAPI.compatible) return\n',
        '  module.hot.accept()\n',
        // remove style tag on dispose
        disposeStyleCode,
        '  if (!module.hot.data) {\n',
        // initial insert
        '    hotAPI.createRecord("' + id + '", __vue__options__)\n',
        '  } else {\n',
        updateCode,
        '  }\n',
        '})()}'
    ];

    return codes.join('');
}

module.exports = exports = function (source, changeInfo, options) {
    var output = '';
    var id = source.id;
    var offsetLineNum = 0;

    // generate style
    var result = generateStyle(
        source, options
    );
    if (result && result.output) {
        output += result.output;
        offsetLineNum += result.lineNum;
    }

    // script
    result = generateScript(
        source, offsetLineNum, options
    );
    result && (output += result.output);
    var map = result && result.map;

    // template
    result = generateTemplate(
        source, map, options
    );
    result && (output += result.output);

    // scoped CSS id
    // check for scoped style nodes
    var hasScopedStyle = source.parseParts.styles.some(function (style) {
        return style.scoped;
    });
    if (hasScopedStyle) {
        output += '__vue__options__._scopeId = "' + id + '"\n';
    }

    // hot reload
    var isProduction = options.isProduction;
    var isServer = options.isServer;
    if (!isProduction && !isServer) {
        output += generateHotReloadCode(source, changeInfo, options);
    }

    if (map) {
        var convert = require('convert-source-map');
        output += '\n' + convert.fromJSON(map.toString()).toComment();
    }

    return {
        map: map && map.toString(),
        content: output
    };
};

exports.generateHotReloadAPIPath = function (opts) {
    var hotReloadAPIPath = opts.hotReloadAPIPath;
    var defaultPath = getHotReloadApiModuleId(
        opts.hotReloadApiDir
    );
    if (typeof hotReloadAPIPath === 'function') {
        hotReloadAPIPath = hotReloadAPIPath(defaultPath);
    }
    return hotReloadAPIPath || defaultPath;
};

exports.generateInsertCssPath = function (opts) {
    var insertCSSPath = opts.insertCSSPath;
    var defaultPath = getInsertCssModuleId(opts.insertCssLibDir);
    if (typeof insertCSSPath === 'function') {
        insertCSSPath = insertCSSPath(defaultPath);
    }
    return insertCSSPath || defaultPath;
};

var fileIdCache = Object.create(null);

/**
 * utility for generating a uid for each component file
 * used in scoped CSS rewriting
 *
 * @param {string} filePath 生成 id 的文件路径
 * @return {string}
 */
exports.generateFileId = function (filePath) {
    return fileIdCache[filePath] || (fileIdCache[filePath] = hash(filePath));
};
