export function formatNumberWithSuffix(value) {
    if (!value && value !== 0) return '';
    const num = Number(value);
    if (isNaN(num)) return value;

    if (num >= 1000000000000) return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';

    return num.toLocaleString();
}

export function parseNumberWithSuffix(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    const clean = value.toString().toUpperCase().replace(/[\$,%]/g, '').trim();
    if (!clean) return 0;

    let multiplier = 1;
    let numStr = clean;

    if (clean.endsWith('T')) {
        multiplier = 1000000000000;
        numStr = clean.slice(0, -1);
    } else if (clean.endsWith('B')) {
        multiplier = 1000000000;
        numStr = clean.slice(0, -1);
    } else if (clean.endsWith('M')) {
        multiplier = 1000000;
        numStr = clean.slice(0, -1);
    } else if (clean.endsWith('K')) {
        multiplier = 1000;
        numStr = clean.slice(0, -1);
    }

    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : num * multiplier;
}
