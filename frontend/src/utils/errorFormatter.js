// Utility functions for formatting compiler output
export function formatCompilerError(errorOutput) {
  if (!errorOutput) return '';
  
  // Clean encoding issues and special characters
  let cleanOutput = cleanEncodingIssues(errorOutput);
  
  // Split by lines and process each line
  const lines = cleanOutput.split('\n');
  let formattedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Skip the initial error message prefix if present
    if (line.startsWith('❌ Error:')) {
      continue;
    }
    
    // Format file paths and line numbers
    if (line.includes('.cpp:') || line.includes('.h:')) {
      formattedLines.push(`<span class="error-location">${line}</span>`);
    }
    // Format error messages (usually start with "error:" or contain "error")
    else if (line.toLowerCase().includes('error') || line.includes('^')) {
      formattedLines.push(`<span class="error-message">${line}</span>`);
    }
    // Format warning messages
    else if (line.toLowerCase().includes('warning')) {
      formattedLines.push(`<span class="warning-message">${line}</span>`);
    }
    // Format note messages
    else if (line.toLowerCase().includes('note')) {
      formattedLines.push(`<span class="note-message">${line}</span>`);
    }
    // Format suggestions (lines with "did you forget" or "suggested")
    else if (line.toLowerCase().includes('did you') || line.includes('suggested')) {
      formattedLines.push(`<span class="suggestion-message">${line}</span>`);
    }
    // Keep other lines as-is
    else {
      formattedLines.push(`<span class="error-info">${line}</span>`);
    }
  }
  
  return formattedLines.join('\n');
}

export function formatCompilerOutput(output) {
  if (!output) return '';
  
  // Clean encoding issues first
  let cleanOutput = cleanEncodingIssues(output);
  
  // Simple formatting for regular output
  return cleanOutput
    .replace(/\n/g, '<br>')
    .replace(/(warning:)/gi, '<span class="output-warning">$1</span>')
    .replace(/(error:)/gi, '<span class="output-error">$1</span>');
}

// Function to clean encoding issues and special characters
function cleanEncodingIssues(text) {
  if (!text) return '';
  
  // Handle common encoding issues
  let cleanText = text;
  
  // Remove byte order marks and other encoding artifacts
  cleanText = cleanText.replace(/\uFEFF/g, ''); // BOM
  cleanText = cleanText.replace(/\0/g, ''); // Null bytes
  
  // Fix common UTF-8 decoding issues
  const encodingFixes = [
    ['â', "'"],
    ['â', "'"],
    ['â', '"'],
    ['â', '"'],
    ['â', '-'],
    ['â', '--'],
    ['â¦', '...'],
    ['Â', ''],
    ['â¬¡', "'"],
    ['â¬¢', "'"],
    ['â', '"'],
    ['â', '"'],
    ['â', '-'],
    ['â', '--'],
    ['â¦', '...']
  ];
  
  for (const [bad, good] of encodingFixes) {
    cleanText = cleanText.split(bad).join(good);
  }
  
  // Remove other problematic characters
  cleanText = cleanText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // eslint-disable-line no-control-regex
  
  // Clean up multiple spaces and newlines
  cleanText = cleanText.replace(/\s+/g, ' ');
  
  return cleanText.trim();
}