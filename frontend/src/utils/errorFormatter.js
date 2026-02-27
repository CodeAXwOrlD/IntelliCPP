// Utility functions for formatting compiler output
export function formatCompilerError(errorOutput) {
  if (!errorOutput) return '';
  
  // Split by lines and process each line
  const lines = errorOutput.split('\n');
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
  
  // Simple formatting for regular output
  return output
    .replace(/\n/g, '<br>')
    .replace(/(warning:)/gi, '<span class="output-warning">$1</span>')
    .replace(/(error:)/gi, '<span class="output-error">$1</span>');
}