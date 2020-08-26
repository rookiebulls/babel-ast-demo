const path = require('path')
const fs = require('fs')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')

const getModuleInfo = file => {
  const content = fs.readFileSync(file, 'utf-8')

  const ast = parser.parse(content, { sourceType: 'module' })
  const deps = {}
  traverse(ast, {
    ImportDeclaration({ node }) {
      const dir = path.dirname(file)
      const abspath = path.resolve(dir, node.source.value)
      deps[node.source.value] = abspath
    }
  })
  const { code } = babel.transformFromAst(ast, null, { presets: ['@babel/preset-env'] })
  return { file, deps, code }
}

const parseModules = file => {
  const root = getModuleInfo(file)
  const stack = [root]
  const depsGraph = {}

  while (stack.length) {
    const node = stack.pop()
    depsGraph[node.file] = { deps: node.deps, code: node.code }
    Object.keys(node.deps).forEach(key => {
      stack.push(getModuleInfo(node.deps[key]))
    })
  }

  return depsGraph
}

const bundle = file => {
  const depsGraph = JSON.stringify(parseModules(file))
  const content = `;(function (graph) {
    function require(file) {
      function absRequire(relPath) {
        console.log('relpath', relPath)
        return require(graph[file].deps[relPath])
      }

      var exports = {}
      ;(function (require, exports, code){
        eval(code)
      })(absRequire, exports, graph[file].code)

      return exports
    }
    require('${file}')

  })(${depsGraph})`

  fs.mkdirSync('./dist')
  fs.writeFileSync('./dist/bundle.js', content)
}

bundle('index.js')

