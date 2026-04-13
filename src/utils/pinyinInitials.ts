/**
 * Lightweight pinyin initial extraction for Chinese characters.
 * Uses localeCompare with 'zh-CN' locale (pinyin sort order in Chromium/Electron).
 *
 * Example: "我的笔记" → "wdbj"
 */

// Boundary characters for each pinyin initial group.
// Each entry is the first common character in that initial's pinyin sort range.
const PINYIN_BOUNDARIES: [string, string][] = [
    ['\u5416', 'a'], // 啊
    ['\u516B', 'b'], // 八
    ['\u64E6', 'c'], // 擦
    ['\u642D', 'd'], // 搭
    ['\u86FE', 'e'], // 蛾
    ['\u53D1', 'f'], // 发
    ['\u5676', 'g'], // 噶
    ['\u54C8', 'h'], // 哈
    ['\u51FB', 'j'], // 击
    ['\u5580', 'k'], // 喀
    ['\u5783', 'l'], // 垃
    ['\u5988', 'm'], // 妈
    ['\u62FF', 'n'], // 拿
    ['\u54E6', 'o'], // 哦
    ['\u556A', 'p'], // 啪
    ['\u4E03', 'q'], // 七
    ['\u7136', 'r'], // 然
    ['\u6492', 's'], // 撒
    ['\u4ED6', 't'], // 他
    ['\u6316', 'w'], // 挖
    ['\u6614', 'x'], // 昔
    ['\u538B', 'y'], // 压
    ['\u5E00', 'z'], // 帀
];

function getCharInitial(char: string): string {
    const code = char.charCodeAt(0);

    // ASCII letters → lowercase
    if (code >= 65 && code <= 90) return char.toLowerCase();
    if (code >= 97 && code <= 122) return char;

    // Digits → keep
    if (code >= 48 && code <= 57) return char;

    // Outside CJK Unified Ideographs → skip
    if (code < 0x4e00 || code > 0x9fff) return '';

    // Binary-search style: iterate from 'z' back to 'a'
    for (let i = PINYIN_BOUNDARIES.length - 1; i >= 0; i--) {
        if (char.localeCompare(PINYIN_BOUNDARIES[i][0], 'zh-CN') >= 0) {
            return PINYIN_BOUNDARIES[i][1];
        }
    }

    return '';
}

/**
 * Convert a string to its pinyin initials.
 * Chinese characters are converted to their pinyin first letter (lowercase).
 * ASCII letters are lowercased. Digits are kept. Other characters are omitted.
 *
 * @example getPinyinInitials("我的笔记") // "wdbj"
 * @example getPinyinInitials("Hello世界") // "hellosj"
 */
export function getPinyinInitials(str: string): string {
    return str.split('').map(getCharInitial).join('');
}
