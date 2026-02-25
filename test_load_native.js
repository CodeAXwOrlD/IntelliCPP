const fs = require('fs');
const path = require('path');
const candidates = [
  path.join(__dirname, 'backend', 'dist', 'codeflow_native.node'),
  path.join(__dirname, 'backend', 'build', 'Release', 'codeflow_native.node'),
  path.join(__dirname, 'backend', 'build', 'codeflow_native.node'),
  path.join(__dirname, 'backend', 'codeflow_native.node'),
  path.join(__dirname, 'dist', 'codeflow_native.node'),
];
let nativePath = candidates.find(p => fs.existsSync(p));
console.log('nativePath =', nativePath);
if (!nativePath) process.exit(2);
const native = require(nativePath);
console.log('exports =', Object.keys(native));
const inst = new native.SuggestionEngine();
console.log('methods:', typeof inst.updateSymbols, typeof inst.getSuggestions);
inst.updateSymbols('#include <vector>\nvector<int> v;');
console.log('symbolCount =', inst.getSymbolCount());
console.log('included =', inst.getIncludedLibraries());
console.log('done');
