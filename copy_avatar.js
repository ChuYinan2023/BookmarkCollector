const fs = require('fs');
const path = require('path');

// 源文件和目标文件路径
const sourceFile = path.join(process.env.USERPROFILE, 'Desktop', 'avatar.png');
const destDir = path.join(__dirname, 'assets');
const destFile = path.join(destDir, 'avatar.png');

// 确保目标目录存在
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// 复制文件
fs.copyFileSync(sourceFile, destFile);
console.log(`头像已成功复制到 ${destFile}`);
