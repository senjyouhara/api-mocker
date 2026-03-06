// .prettierrc.js
// 访问 https://prettier.io/docs/en/options.html 查看所有选项
module.exports = {
  // 每行最大字符数
  printWidth: 100,
  // tab宽度为2空格
  tabWidth: 2,
  // 是否使用tab替代空格
  useTabs: false,
  // 结尾是否添加分号
  semi: true,
  // 是否使用单引号
  singleQuote: true,
  // 对象属性的引号使用：'as-needed' | 'consistent' | 'preserve'
  quoteProps: 'as-needed',
  // JSX中使用单引号
  jsxSingleQuote: false,
  // 多行时尽可能打印尾随逗号 'none' | 'es5' | 'all'
  trailingComma: 'es5', // 在ES5中有效的结尾逗号（对象、数组等）, 'all' 包括函数参数
  // 对象前后添加空格 { foo: bar }
  bracketSpacing: true,
  // JSX标签闭合括号是否换行
  // <button
  //   className="prettier-class"
  //   id="prettier-id"
  //   onClick={this.handleClick}>
  //   Click Here
  // </button>
  // false:
  // <button
  //   className="prettier-class"
  //   id="prettier-id"
  //   onClick={this.handleClick}
  // >
  //   Click Here
  // </button>
  bracketSameLine: false, // 在jsx中把'>' 是否单独放一行, 旧版叫 jsxBracketSameLine
  // 箭头函数参数是否总是带括号 'always' | 'avoid'
  arrowParens: 'always',
  // Range 相关，通常不需要改
  // rangeStart: 0,
  // rangeEnd: Infinity,
  // 解析器推断，通常不需要指定
  // parser: undefined,
  // 文件路径，通常不需要指定
  // filepath: undefined,
  // 是否需要在文件开头插入 @format pragma
  requirePragma: false,
  // 是否在已被 Prettier 格式化的文件顶部插入 @format pragma
  insertPragma: false,
  // Markdown 处理方式 'always' | 'never' | 'preserve'
  proseWrap: 'preserve',
  // HTML 空白敏感度 'css' | 'strict' | 'ignore'
  htmlWhitespaceSensitivity: 'css',
  // Vue 文件脚本和样式标签缩进
  vueIndentScriptAndStyle: false,
  // 行尾换行符 'lf' | 'crlf' | 'cr' | 'auto'
  endOfLine: 'lf',
  // 是否格式化嵌入式语言 'auto' | 'off'
  embeddedLanguageFormatting: 'auto',
  // 单个属性换行时，是否将属性放在单独的行上
  singleAttributePerLine: false, // Vue/JSX中单个属性是否独占一行
};
