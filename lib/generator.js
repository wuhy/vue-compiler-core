/**
 * @file vue 组件编译后代码生成器
 * @author sparklewhy@gmail.com
 */

var path = require('path');
var hash = require('hash-sum');
var SourceMap = require('source-map');
var SourceMapGenerator = SourceMap.SourceMapGenerator;

var util = require('./util');

var splitRegExp = /\r?\n/g;
var emptyRegExp = /^(?:\/\/)?\s*$/;
var STYLE_MODULE_VAR_NAME = '__fisx_style_dispose__';

function getCode(part) {
    var output = part && part.output;
    if (typeof output !== 'string') {
        output && (output = output.code);
    }
    return output || '';
}


var isNpm3;
function isNPM3() {
    if (isNpm3 !== null) {
        return isNpm3;
    }

    var filePath = path.resolve(__dirname, '../node_modules', 'resolve');
    isNpm3 = !util.isPathExists(filePath);
    return isNpm3;
}

function getInsertCssModuleId(baseDir) {
    var pkgName = require('../package.json').name;
    var id = path.join(pkgName, 'lib', 'insert-css');

    if (!isNPM3()) {
        id = path.join(baseDir, 'node_modules', id);
    }
    return util.normalizePath(id);
}

function getHotReloadApiModuleId(baseDir, moduleName) {
    var id = moduleName;
    if (!isNPM3()) {
        id = path.join(baseDir, 'node_modules', moduleName);
    }
    return util.normalizePath(id);
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

function generateCodeSourceMap(filePath, content, generated, output) {
    // hot-reload source map busting
    var hashedFilename = generateSourceMapFileName(filePath, content);
    var map = new SourceMap.SourceMapGenerator();
    map.setSourceContent(hashedFilename, content);
    map._hashedFilename = hashedFilename;

    if (!generated.output) {
        return map;
    }

    // check input source map from babel/coffee etc
    var code = getCode(generated);
    var inMap = generated.output.map;
    var inMapConsumer = inMap && new SourceMap.SourceMapConsumer(inMap);

    var generatedOffset = (output ? output.split(splitRegExp).length : 0) + 1;
    code.split(splitRegExp).forEach(function (line, index) {
        var ln = index + 1;
        var originalLine = inMapConsumer
            ? inMapConsumer.originalPositionFor({line: ln, column: 0}).line
            : ln;

        if (!originalLine) {
            return;
        }

        map.addMapping({
            source: hashedFilename,
            generated: {
                line: ln + generatedOffset,
                column: 0
            },
            original: {
                line: originalLine,
                column: 0
            }
        });
    });

    return map;
}

function addTemplateSourceMap(content, template, output, generated, map) {
    var startLineNo = output.split(splitRegExp).length;
    var endLineNo = startLineNo + generated.split(splitRegExp).length;
    var originalTplLineStartNo = content
        .slice(0, template.raw.start)
        .split(splitRegExp).length;

    for (; startLineNo < endLineNo; startLineNo++) {
        map.addMapping({
            source: map._hashedFilename,
            generated: {
                line: startLineNo,
                column: 0
            },
            original: {
                line: originalTplLineStartNo,
                column: 0
            }
        });
    }
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

    if (!options.extractCSS) {
        var insertCSSPath = exports.generateInsertCssPath(options);
        result.output = 'var ' + STYLE_MODULE_VAR_NAME + ' = require("'
            + insertCSSPath + '").insert(' + JSON.stringify(styleCode) + ')\n';
    }

    return result;
}

function generateScript(source, output, options) {
    var script = source.script;
    if (!script) {
        return;
    }

    var code = getCode(script);
    var map = null;
    var filePath = source.filePath;
    if (options.sourceMap) {
        map = generateCodeSourceMap(filePath, source.content, script, output);
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

function generateTemplate(source, output, map, options) {
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

    if (map) {
        addTemplateSourceMap(source.content, template, output, generated, map);
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

    var disposeStyleCode = hasStyle && !options.extractCSS
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
        '  hotAPI.install(require("vue"), true)\n',
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

function generateSourceMap(fileName, source, generatedContent) {
    var map = new SourceMapGenerator();
    map.setSourceContent(fileName, source);

    generatedContent.split(splitRegExp).forEach(function (line, index) {
        if (!emptyRegExp.test(line)) {
            map.addMapping({
                source: fileName,
                original: {
                    line: index + 1,
                    column: 0
                },
                generated: {
                    line: index + 1,
                    column: 0
                }
            });
        }
    });

    return map.toJSON();
}

module.exports = exports = function (source, changeInfo, options) {
    var output = '';
    var id = source.id;

    // generate style
    var result = generateStyle(
        source, options
    );
    result && result.output && (output += result.output);

    // script
    result = generateScript(
        source, output, options
    );
    result && (output += result.output);
    var map = result && result.map;

    // template
    result = generateTemplate(
        source, output, map, options
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

    return {
        map: map && map.toString(),
        content: output
    };
};

exports.generateHotReloadAPIPath = function (opts) {
    var hotReloadAPIPath = opts.hotReloadAPIPath;
    var pkgName = opts.hostPkgName;
    var defaultPath = getHotReloadApiModuleId(
        pkgName, 'vue-hot-reload-api'
    );
    if (typeof hotReloadAPIPath === 'function') {
        hotReloadAPIPath = hotReloadAPIPath(defaultPath);
    }
    return hotReloadAPIPath || defaultPath;
};

exports.generateInsertCssPath = function (opts) {
    var insertCSSPath = opts.insertCSSPath;
    var pkgName = opts.hostPkgName;
    var defaultPath = getInsertCssModuleId(pkgName);
    if (typeof insertCSSPath === 'function') {
        insertCSSPath = insertCSSPath(defaultPath);
    }
    return insertCSSPath || defaultPath;
};

exports.initSourceMap = function (parts, filePath, content) {
    var fileNameWithHash = generateSourceMapFileName(filePath, content);
    if (parts.script && !parts.script.src) {
        parts.script.map = generateSourceMap(
            fileNameWithHash,
            content,
            parts.script.content
        );
    }

    if (parts.styles) {
        parts.styles.forEach(function (style) {
            if (style.src) {
                return;
            }

            style.map = generateSourceMap(
                fileNameWithHash,
                content,
                style.content
            );
        });
    }
};

exports.generateSourceMapFileName = generateSourceMapFileName;

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
