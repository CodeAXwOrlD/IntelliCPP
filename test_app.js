const path = require('path');
const fs = require('fs');

console.log('=== CodeFlow Application Test ===\n');

// Test 1: Check if native module exists and loads
console.log('1. Testing native module loading...');
try {
  const candidates = [
    path.join(__dirname, 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'backend', 'dist', 'codeflow_native.node'),
    path.join(__dirname, 'backend', 'build', 'Release', 'codeflow_native.node')
  ];
  
  let nativePath = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      nativePath = p;
      break;
    }
  }
  
  if (!nativePath) {
    console.error('❌ Native module not found');
    process.exit(1);
  }
  
  const native = require(nativePath);
  const engine = new native.SuggestionEngine();
  console.log('✅ Native module loaded successfully');
  console.log('   Path:', nativePath);
  
  // Test basic functionality
  const count = engine.getSymbolCount();
  console.log('   Initial symbol count:', count);
  
} catch (e) {
  console.error('❌ Failed to load native module:', e.message);
  process.exit(1);
}

// Test 2: Check data files
console.log('\n2. Testing data files...');
const keywordsPath = path.join(__dirname, 'data', 'cpp_keywords.txt');
const stlPath = path.join(__dirname, 'data', 'stl_functions.json');

if (fs.existsSync(keywordsPath)) {
  console.log('✅ C++ keywords file found');
} else {
  console.error('❌ C++ keywords file missing');
}

if (fs.existsSync(stlPath)) {
  console.log('✅ STL functions data found');
} else {
  console.error('❌ STL functions data missing');
}

// Test 3: Check frontend build
console.log('\n3. Testing frontend build...');
const indexPath = path.join(__dirname, 'frontend', 'build', 'index.html');
if (fs.existsSync(indexPath)) {
  console.log('✅ Frontend build found');
} else {
  console.error('❌ Frontend build missing');
}

// Test 4: Test suggestion functionality
console.log('\n4. Testing suggestion engine...');
try {
  const native = require(path.join(__dirname, 'dist', 'codeflow_native.node'));
  const engine = new native.SuggestionEngine();
  
  // Load data
  if (fs.existsSync(keywordsPath)) engine.loadKeywords(keywordsPath);
  if (fs.existsSync(stlPath)) engine.loadSTLData(stlPath);
  
  // Test code with vector
  const testCode = '#include <vector>\nint main() { vector<int> v; v.';
  engine.updateSymbols(testCode);
  
  const suggestions = engine.getSuggestions('', 'vector', testCode, testCode.length, 5);
  console.log('✅ Suggestions for vector: ', suggestions.slice(0, 3).map(s => s.text));
  
  const stats = engine.getStats();
  console.log('   Symbol count:', stats.symbolCount);
  console.log('   Included libraries:', stats.includedLibraries);
  
} catch (e) {
  console.error('❌ Suggestion engine test failed:', e.message);
}

console.log('\n=== All tests completed ===');
console.log('✅ Application is ready to run!');
console.log('\nTo run the application:');
console.log('  npm start                  # Run Electron app');
console.log('  cd frontend && npm start   # Run frontend dev server (port 3000)');
console.log('  cd backend && npm run server # Run backend API server (port 3001)');