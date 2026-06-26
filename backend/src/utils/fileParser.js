const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

/**
 * 通用文件文本提取工具
 * 支持 .pdf 和 .docx
 */
async function extractText(filePath) {
  // 🚀 修复路径解析逻辑：针对以 / 开头的路径，path.join 会正确合并到 process.cwd()
  // 而 path.isAbsolute 在 Windows 下会误判 / 开头的路径为绝对路径
  const fullPath = path.isAbsolute(filePath) && !filePath.startsWith('/') 
    ? filePath 
    : path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error('文件不存在: ' + fullPath);
  }

  const ext = path.extname(fullPath).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(fullPath);
    const data = await pdf(dataBuffer);
    return data.text;
  } 
  
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: fullPath });
    return result.value;
  }

  if (ext === '.doc') {
    throw new Error('目前仅支持 .docx 格式的 Word 文档，请另存为 .docx 后再试');
  }

  throw new Error('不支持的文件格式: ' + ext);
}

module.exports = { extractText };
