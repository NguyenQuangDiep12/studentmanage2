const fs = require('fs');
const path = require('path');

const targetFiles = [
    'c:/APP/dashboard.html',
    'c:/APP/index.html',
    'c:/APP/js/app.js',
    'c:/APP/js/co-cau-dao-tao.js',
    'c:/APP/js/dang-ky.js',
    'c:/APP/js/diem-danh.js',
    'c:/APP/js/diem.js',
    'c:/APP/js/ket-qua.js',
    'c:/APP/js/kien-nghi.js',
    'c:/APP/js/lop-hoc-phan.js',
    'c:/APP/js/mock-data.js',
    'c:/APP/js/mon-hoc.js',
    'c:/APP/js/tin-tuc.js',
    'c:/APP/js/tkb.js',
    'c:/APP/js/users.js',
    'c:/APP/js/components/dashboard.js',
    'c:/APP/js/components/header.js',
    'c:/APP/js/components/modal.js',
    'c:/APP/js/components/sidebar.js',
    'c:/APP/js/components/toast.js'
];

const results = [];

targetFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, lineIdx) => {
        // Match string literals
        // We look for strings containing Vietnamese or typical UI words
        const stringRegex = /(["'`])((?:\\.|(?!\1).)*?)\1/g;
        let match;
        while ((match = stringRegex.exec(line)) !== null) {
            const quote = match[1];
            const str = match[2];
            
            // Check if string contains Vietnamese or common user-facing text
            const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(str);
            const isUserFacing = hasVietnamese || /(Vui lòng|Thành công|Thất bại|Đăng nhập|Lỗi|Admin|Hệ thống|Thông báo|Chưa có|Không tìm|Yêu cầu)/i.test(str);
            
            if (isUserFacing) {
                // Check if it ends with . or ; or ...
                const trimmed = str.trim();
                if (/[\.;]$/.test(trimmed)) {
                    // Make sure it's not an html entity like &nbsp;
                    if (!/&[a-z0-9#]+;$/i.test(trimmed)) {
                        results.push({
                            file: path.basename(filePath),
                            line: lineIdx + 1,
                            type: 'JS_STRING',
                            content: str
                        });
                    }
                }
            }
        }

        // Match HTML text between > and <
        const htmlTagRegex = />([^<]+)</g;
        let htmlMatch;
        while ((htmlMatch = htmlTagRegex.exec(line)) !== null) {
            const text = htmlMatch[1].trim();
            const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i.test(text);
            if (hasVietnamese && /[\.;]$/.test(text)) {
                if (!/&[a-z0-9#]+;$/i.test(text)) {
                    results.push({
                        file: path.basename(filePath),
                        line: lineIdx + 1,
                        type: 'HTML_TAG',
                        content: text
                    });
                }
            }
        }
    });
});

console.log(`Found ${results.length} occurrences:`);
results.forEach(r => {
    console.log(`[${r.file}:${r.line}] (${r.type}) ${r.content}`);
});
