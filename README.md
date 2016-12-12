vue-compiler-core
======
[![Dependency Status](https://david-dm.org/wuhy/fisx-parser-vue.svg)](https://david-dm.org/wuhy/vue-compiler-core) [![devDependency Status](https://david-dm.org/wuhy/vue-compiler-core/dev-status.svg)](https://david-dm.org/wuhy/vue-compiler-core#info=devDependencies) [![NPM Version](https://img.shields.io/npm/v/vue-compiler-core.svg?style=flat)](https://npmjs.org/package/vue-compiler-core)

> The compiler core for compiling single vue component file. 

## How to use

### Install

```shell
npm install vue-compiler-core --save-dev
```

### Implementation

If you use [fisx](https://github.com/wuhy/fisx), the available vue compiler:

* Vue 1.x compiler, please refer [fisx-vue1-loader](https://github.com/wuhy/fisx-vue1-loader)

* Vue 2.x compiler, please refer [fisx-vue-loader](https://github.com/wuhy/fisx-vue-loader)

### API

* compile(vueParts, options) - compile the vue parts (including the template, script and styles), output the compile result

* compiler.find(name) - find the builtin lang compiler

* compiler.register(type, compiler, defaultOptions) - register custom lang compiler

* parse(filePath, content, parser) - parse vue file to resolved vue parts, support cache

* registerParser(name, parser, defaultOptions) - register custom builtin lang compiler parser

### Compile options

TODO

### Reference

* [vueify](https://github.com/vuejs/vueify) for browserify
* [vue-loader](https://github.com/vuejs/vue-loader) for webpack

