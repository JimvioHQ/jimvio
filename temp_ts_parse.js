const ts = require('typescript');
const fs = require('fs');
const path = 'components/studio/LiveDashboardScreen.tsx';
const source = fs.readFileSync(path, 'utf8');
const result = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const diagnostics = result.parseDiagnostics;
console.log(JSON.stringify(diagnostics.map(d => ({ start: d.start, length: d.length, message: ts.flattenDiagnosticMessageText(d.messageText, '\n'), code: d.code })), null, 2));
