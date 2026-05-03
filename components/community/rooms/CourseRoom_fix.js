const fs = require('fs');
const file = 'c:\\Users\\pc\\Desktop\\Jimvio\\jimvio\\components\\community\\rooms\\CourseRoom.tsx';
let lines = fs.readFileSync(file, 'utf-8').split('\n');

// 1. Delete lines 833 to 1107 (0-indexed 832 to 1106).
// We'll just splice it out.
// Wait, we need to locate the start of the duplicate block dynamically in case line numbers shift.
const dupStart = lines.findIndex((l, i) => i > 800 && l.trim() === 'return (');
if (dupStart !== -1) {
    lines.splice(dupStart); // removes from dupStart to end
}

// 2. Add the proper tail:
lines.push(
    '  return (',
    '    <>',
    '      {mainUI}',
    '      {studioNode && typeof document !== \'undefined\' && createPortal(studioNode, document.body)}',
    '    </>',
    '  );',
    '}'
);

// 3. Change the first return to `const mainUI = (`
const returnStart = lines.findIndex(l => l === '  return (');
if (returnStart !== -1) {
    lines[returnStart] = '  const mainUI = (';
}

// 4. Close the mainUI assignment just before `const studioNode =`
const studioNodeStart = lines.findIndex(l => l.includes('const studioNode = editingItem && ('));
if (studioNodeStart !== -1) {
    // Insert `  );` right before the studioNode definition
    lines.splice(studioNodeStart - 1, 0, '  );');
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed CourseRoom.tsx!');
