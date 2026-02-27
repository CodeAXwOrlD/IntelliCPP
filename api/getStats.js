export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code = '' } = req.body;
    
    // Count some basic stats from the code
    const lines = code.split('\n').length;
    const charCount = code.length;
    const wordCount = code.trim() ? code.trim().split(/\s+/).length : 0;
    
    // Mock included libraries detection
    const includedLibraries = code.match(/#include\s+<([^>]+)>/g) || [];
    const extractedLibs = includedLibraries.map(lib => lib.replace('#include <', '').replace('>', ''));
    
    res.status(200).json({
      symbolCount: Math.min(wordCount, 100), // Mock symbol count
      includedLibraries: extractedLibs,
      symbolTable: {},
      linesOfCode: lines,
      characterCount: charCount,
      wordCount: wordCount
    });
  } catch (err) {
    console.error('Error getting stats:', err.message);
    res.status(500).json({
      symbolCount: 0,
      includedLibraries: [],
      symbolTable: {},
      linesOfCode: 0,
      characterCount: 0,
      wordCount: 0
    });
  }
}