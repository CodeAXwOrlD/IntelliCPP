// Mock C++ keywords and STL functions
const cppKeywords = [
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof',
  'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while', 'bool', 'class', 'explicit', 'friend', 'inline',
  'mutable', 'namespace', 'operator', 'private', 'protected', 'public',
  'template', 'virtual', 'wchar_t', 'asm', 'dynamic_cast', 'reinterpret_cast',
  'try', 'catch', 'throw', 'using', 'const_cast', 'typeid', 'typename',
  'template', 'alignas', 'alignof', 'constexpr', 'decltype', 'final',
  'noexcept', 'override', 'static_assert', 'thread_local', 'nullptr',
  'override', 'final', 'export', 'static_assert', 'thread_local'
];

const stlFunctions = [
  'cout', 'cin', 'endl', 'vector', 'string', 'array', 'map', 'unordered_map',
  'set', 'unordered_set', 'queue', 'stack', 'deque', 'list', 'forward_list',
  'priority_queue', 'pair', 'tuple', 'function', 'bind', 'mem_fn',
  'shared_ptr', 'unique_ptr', 'weak_ptr', 'allocator', 'addressof',
  'make_shared', 'make_unique', 'move', 'swap', 'forward', 'to_string',
  'stoi', 'stol', 'stoll', 'stoull', 'stof', 'stod', 'stold',
  'size', 'empty', 'clear', 'begin', 'end', 'rbegin', 'rend', 'push',
  'pop', 'top', 'front', 'back', 'insert', 'erase', 'emplace', 'emplace_back',
  'reserve', 'resize', 'capacity', 'max_size', 'shrink_to_fit', 'assign',
  'at', 'operator[]', 'data', 'c_str', 'substr', 'compare', 'find', 'rfind',
  'find_first_of', 'find_last_of', 'find_first_not_of', 'find_last_not_of',
  'count', 'lower_bound', 'upper_bound', 'equal_range', 'binary_search',
  'sort', 'reverse', 'next_permutation', 'prev_permutation', 'rotate',
  'random_shuffle', 'partition', 'stable_partition', 'merge', 'inplace_merge',
  'includes', 'set_union', 'set_intersection', 'set_difference',
  'set_symmetric_difference', 'push_heap', 'pop_heap', 'make_heap',
  'is_heap', 'sort_heap', 'min', 'max', 'minmax', 'min_element', 'max_element',
  'minmax_element', 'accumulate', 'inner_product', 'adjacent_difference',
  'partial_sum', 'iota', 'gcd', 'lcm', 'reduce', 'transform_reduce',
  'transform_inclusive_scan', 'transform_exclusive_scan', 'inclusive_scan',
  'exclusive_scan', 'is_sorted', 'is_sorted_until', 'is_partitioned',
  'is_heap_until', 'all_of', 'any_of', 'none_of', 'for_each', 'for_each_n',
  'copy', 'copy_n', 'copy_if', 'copy_backward', 'move', 'move_backward',
  'fill', 'fill_n', 'generate', 'generate_n', 'remove', 'remove_if',
  'remove_copy', 'remove_copy_if', 'replace', 'replace_if', 'replace_copy',
  'replace_copy_if', 'swap_ranges', 'iter_swap', 'reverse_copy',
  'rotate_copy', 'shuffle', 'sample', 'unique', 'unique_copy', 'is_permutation',
  'search', 'search_n', 'find_end', 'find_first_of', 'adjacent_find',
  'mismatch', 'equal', 'lexicographical_compare', 'is_disjoint', 'is_subset',
  'is_proper_subset', 'is_superset', 'is_proper_superset', 'set_symmetric_difference',
  'shift_left', 'shift_right'
];

export default async function handler(req, res) {
  const { method } = req;
  
  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint } = req.query;
  
  try {
    if (endpoint === 'getSuggestions') {
      const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;
      
      // Filter keywords and STL functions based on the prefix
      let suggestions = [];
      
      if (prefix) {
        // Case insensitive search for better UX
        const lowerPrefix = prefix.toLowerCase();
        suggestions = [
          ...cppKeywords.filter(kw => kw.toLowerCase().startsWith(lowerPrefix)),
          ...stlFunctions.filter(func => func.toLowerCase().startsWith(lowerPrefix))
        ];
        
        // If prefix is 'vector', prioritize vector-related functions
        if (prefix.toLowerCase().includes('vector')) {
          // Reorder to put vector-related items first
          const vectorRelated = suggestions.filter(item => 
            item.toLowerCase().includes('vector') || 
            ['push_back', 'pop_back', 'size', 'clear', 'begin', 'end', 'at', 'insert', 'erase'].includes(item)
          );
          const otherItems = suggestions.filter(item => 
            !vectorRelated.includes(item)
          );
          suggestions = [...vectorRelated, ...otherItems];
        }
      } else {
        suggestions = [...cppKeywords.slice(0, 5), ...stlFunctions.slice(0, 5)];
      }

      // Limit to 10 suggestions and format them properly
      const formattedSuggestions = suggestions.slice(0, 10).map(item => ({
        label: item,
        kind: item === 'cout' || item === 'cin' || item === 'endl' ? 'Variable' : 
              ['vector', 'string', 'array', 'map', 'set', 'queue', 'stack', 'list'].includes(item) ? 'Class' :
              'Keyword',
        detail: `C++ ${item}`,
        insertText: item,
        text: item  // Adding text property for the frontend to use
      }));

      // Simulate small delay for more realistic feel
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return res.status(200).json(formattedSuggestions);
    } 
    else if (endpoint === 'getStats') {
      const { code = '' } = req.body;
      
      // Count some basic stats from the code
      const lines = code.split('\n').length;
      const charCount = code.length;
      const wordCount = code.trim() ? code.trim().split(/\s+/).length : 0;
      
      // Mock included libraries detection
      const includedLibraries = code.match(/#include\s+<([^>]+)>/g) || [];
      const extractedLibs = includedLibraries.map(lib => lib.replace('#include <', '').replace('>', ''));
      
      return res.status(200).json({
        symbolCount: Math.min(wordCount, 100), // Mock symbol count
        includedLibraries: extractedLibs,
        symbolTable: {},
        linesOfCode: lines,
        characterCount: charCount,
        wordCount: wordCount
      });
    } 
    else if (endpoint === 'runCode') {
      const { code = '' } = req.body;
      
      // More realistic simulation of code execution
      // Check for various code issues first
      if (!code.includes('#include')) {
        return res.status(200).json({
          success: false,
          output: '',
          error: 'fatal error: no input files\ncompilation terminated.',
          executionTime: 0
        });
      } else if (!code.includes('int main')) {
        return res.status(200).json({
          success: false,
          output: '',
          error: 'error: no main() function found\nlinker error: entry point not found',
          executionTime: 0
        });
      } else if (code.includes('cout') && !code.includes('<iostream>')) {
        return res.status(200).json({
          success: false,
          output: '',
          error: 'error: \'cout\' was not declared in this scope\nnote: \'cout\' is defined in header <iostream>',
          executionTime: 0
        });
      } else if (code.includes('vector') && !code.includes('<vector>')) {
        return res.status(200).json({
          success: false,
          output: '',
          error: 'error: \'vector\' was not declared in this scope\nnote: \'vector\' is defined in header <vector>',
          executionTime: 0
        });
      } else {
        // Check for common syntax errors
        if (code.includes('error') || code.includes('// ERROR') || code.includes('***')) {
          return res.status(200).json({
            success: false,
            output: '',
            error: 'syntax error: unexpected token\ncompilation failed',
            executionTime: 0
          });
        }
        
        // If code looks valid, simulate execution
        let simulatedOutput = 'Program compiled and executed successfully\n';
        
        // Check for specific outputs based on code content
        if (code.includes('cout << "Hello') || code.includes('cout << "hello') || code.includes('cout<<"Hello')) {
          const helloMatch = code.match(/cout\s*<<\s*"([^"]+)"/);
          if (helloMatch) {
            simulatedOutput += `${helloMatch[1]}\n`;
          } else {
            simulatedOutput += 'Hello, World!\n';
          }
        } else if (code.includes('cout')) {
          // Try to extract what would be printed
          const printMatches = code.match(/cout\s*<<\s*["']([^"']+)["']/g);
          if (printMatches) {
            printMatches.forEach(match => {
              const text = match.match(/["']([^"']+)["']/);
              if (text) simulatedOutput += `${text[1]}\n`;
            });
          } else {
            simulatedOutput += 'Program output\n';
          }
        }
        
        simulatedOutput += 'Process exited with code 0';
        
        // Simulate execution time
        const execTime = Math.floor(Math.random() * 300) + 50; // 50-350ms
        
        return res.status(200).json({
          success: true,
          output: simulatedOutput,
          error: '',
          executionTime: execTime
        });
      }
    } 
    else {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (err) {
    console.error('Error processing request:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}