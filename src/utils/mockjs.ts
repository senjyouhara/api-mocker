import Mock from 'mockjs';
import { js_beautify } from 'js-beautify';
import { parse } from 'acorn';

/**
 * 移除 JSON 字符串中的注释
 * @param jsonStr 可能包含注释的 JSON 字符串
 * @returns 移除注释后的 JSON 字符串
 */
function removeJsonComments(jsonStr: string): string {
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];
    const nextChar = jsonStr[i + 1];

    // 处理字符串
    if (!inString && (char === '"' || char === '\'')) {
      inString = true;
      stringChar = char;
      result += char;
      i++;
      continue;
    }

    if (inString) {
      result += char;
      if (char === '\\' && i + 1 < jsonStr.length) {
        result += jsonStr[i + 1];
        i += 2;
        continue;
      }
      if (char === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }

    // 处理单行注释
    if (char === '/' && nextChar === '/') {
      while (i < jsonStr.length && jsonStr[i] !== '\n') {
        i++;
      }
      continue;
    }

    // 处理多行注释
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < jsonStr.length - 1 && !(jsonStr[i] === '*' && jsonStr[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * 规范化非标准 JSON（处理无引号键名、单引号、尾随逗号）
 * @param jsonStr 非标准 JSON 字符串
 * @returns 规范化后的 JSON 字符串
 */
function normalizeJson(jsonStr: string): string {
  // 先处理无引号的键名
  const temp = jsonStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');

  // 处理单引号和字符串内的双引号
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i < temp.length) {
    const char = temp[i];

    if (!inString && (char === '"' || char === '\'')) {
      inString = true;
      stringChar = char;
      result += '"';
      i++;
      continue;
    }

    if (inString) {
      if (char === '\\' && i + 1 < temp.length) {
        result += char + temp[i + 1];
        i += 2;
        continue;
      }
      if (char === stringChar) {
        inString = false;
        result += '"';
        i++;
        continue;
      }
      if (stringChar === '\'' && char === '"') {
        result += '\\"';
        i++;
        continue;
      }
      result += char;
      i++;
      continue;
    }

    result += char;
    i++;
  }

  // 移除尾随逗号
  result = result.replace(/,(\s*[}\]])/g, '$1');

  return result;
}

/**
 * 解析 Mock.js 表达式并生成数据（支持 function 和正则表达式）
 * @param template Mock.js 模板字符串
 * @returns 生成的数据字符串
 * @throws 解析失败时抛出错误
 */
export function parseMockTemplate(template: string): string {
  // 空模板直接返回
  if (!template.trim()) {
    return '';
  }

  let lastError: Error | null = null;

  try {
    // 先移除注释
    const cleanTemplate = removeJsonComments(template);

    // 尝试用 eval 解析（支持 function 和正则）

    const parsed = eval(`(${cleanTemplate})`);
    const result = Mock.mock(parsed);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    lastError = e as Error;
  }

  // 回退到 JSON.parse
  try {
    const cleanJson = normalizeJson(removeJsonComments(template));
    const parsed = JSON.parse(cleanJson);
    const result = Mock.mock(parsed);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    lastError = e as Error;
  }

  // 解析失败，抛出错误
  throw new Error(`Mock 模板解析失败: ${lastError?.message || '未知错误'}`);
}

/**
 * 格式化 JSON 字符串（支持注释、单引号、尾随逗号）
 * @param jsonStr JSON 字符串
 * @returns 格式化后的 JSON 字符串
 */
export function formatJson(jsonStr: string): string {
  try {
    const cleanJson = normalizeJson(removeJsonComments(jsonStr));
    const parsed = JSON.parse(cleanJson);
    return js_beautify(JSON.stringify(parsed), { indent_size: 2 });
  } catch {
    return jsonStr;
  }
}

/**
 * 格式化 JavaScript 代码
 * @param jsCode JavaScript 代码字符串
 * @returns 格式化后的 JavaScript 代码
 */
export function formatJavaScript(jsCode: string): string {
  try {
    return js_beautify(jsCode, { indent_size: 2 });
  } catch {
    return jsCode;
  }
}

/**
 * 验证 JavaScript 代码是否有效
 * @param jsCode JavaScript 代码字符串
 * @returns 验证结果，valid 为 true 表示有效，否则 error 包含错误信息和行号
 */
export function validateJavaScript(jsCode: string): {
  valid: boolean;
  error?: string;
  line?: number;
} {
  if (!jsCode.trim()) {
    return { valid: true };
  }

  try {
    parse(jsCode, { ecmaVersion: 2020 });
    return { valid: true };
  } catch (e: any) {
    const line = e.loc?.line;
    const errorMsg = line ? `第 ${line} 行: ${e.message}` : e.message;
    return { valid: false, error: errorMsg, line };
  }
}

/**
 * 验证 JSON 字符串是否有效（支持注释、单引号、尾随逗号）
 * @param jsonStr JSON 字符串
 * @returns 验证结果，valid 为 true 表示有效，否则 error 包含错误信息和行号
 */
export function validateJson(jsonStr: string): { valid: boolean; error?: string; line?: number } {
  if (!jsonStr.trim()) {
    return { valid: true };
  }

  // 检测不支持的类型：function 和正则表达式
  const cleanStr = removeJsonComments(jsonStr);

  // 检测 function 关键字
  if (/\bfunction\s*\(/.test(cleanStr)) {
    return { valid: false, error: '不支持 function 类型，请使用 Mock.js 占位符语法' };
  }

  // 检测正则表达式字面量
  if (/:\s*\/[^/]+\/[gimsuy]*\s*[,}\]]/.test(cleanStr)) {
    return { valid: false, error: '不支持正则表达式类型，请使用 @regexp 占位符' };
  }

  // 预处理：规范化
  const cleanJson = normalizeJson(cleanStr);

  try {
    JSON.parse(cleanJson);
    return { valid: true };
  } catch (e) {
    const error = e as SyntaxError;
    let errorMsg = error.message;
    let line: number | undefined;

    // 方法1: 从 "at position X" 提取位置
    const posMatch = errorMsg.match(/position\s+(\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      line = getLineFromPosition(cleanJson, pos);
    }

    // 方法2: 从 "at line X column Y" 提取
    if (!line) {
      const lineMatch = errorMsg.match(/line\s+(\d+)/i);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
      }
    }

    // 方法3: 尝试逐行解析找到错误行
    if (!line) {
      line = findErrorLine(cleanJson);
    }

    if (line) {
      errorMsg = `第 ${line} 行: ${simplifyErrorMessage(errorMsg)}`;
    } else {
      errorMsg = simplifyErrorMessage(errorMsg);
    }

    return { valid: false, error: errorMsg, line };
  }
}

/**
 * 根据字符位置计算行号
 */
function getLineFromPosition(str: string, pos: number): number {
  const beforeError = str.substring(0, Math.min(pos, str.length));
  return (beforeError.match(/\n/g) || []).length + 1;
}

/**
 * 逐行解析找到错误行
 */
function findErrorLine(jsonStr: string): number | undefined {
  const lines = jsonStr.split('\n');
  let accumulated = '';

  for (let i = 0; i < lines.length; i++) {
    accumulated += (i > 0 ? '\n' : '') + lines[i];
    // 尝试检测到当前行为止是否有明显的语法错误
    const openBraces = (accumulated.match(/\{/g) || []).length;
    const closeBraces = (accumulated.match(/\}/g) || []).length;
    const openBrackets = (accumulated.match(/\[/g) || []).length;
    const closeBrackets = (accumulated.match(/\]/g) || []).length;

    // 如果闭合括号多于开放括号，说明这行有问题
    if (closeBraces > openBraces || closeBrackets > openBrackets) {
      return i + 1;
    }
  }

  return undefined;
}

/**
 * 简化错误信息
 */
function simplifyErrorMessage(msg: string): string {
  // 移除 "is not valid JSON" 等冗余信息
  msg = msg.replace(/is not valid JSON/gi, '').trim();
  // 翻译常见错误
  if (msg.includes('Unexpected token')) {
    const tokenMatch = msg.match(/Unexpected token\s+'?([^'",]+)'?/i);
    if (tokenMatch) {
      return `意外的字符 '${tokenMatch[1]}'`;
    }
    return '意外的字符';
  }
  if (msg.includes('Unexpected end')) {
    return 'JSON 不完整，缺少闭合括号';
  }
  if (msg.includes('Expected')) {
    return msg.replace(/Expected/gi, '期望');
  }
  return msg;
}
