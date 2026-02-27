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
  'stoi', 'stol', 'stoll', 'stoul', 'stoull', 'stof', 'stod', 'stold',
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

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prefix = '', contextType = 'global', code = '', cursorPosition = 0 } = req.body;
    console.log('POST /api/getSuggestions', { prefix, contextType, cursorPosition });

    // Filter keywords and STL functions based on the prefix
    let suggestions = [];
    
    if (prefix) {
      suggestions = [
        ...cppKeywords.filter(kw => kw.startsWith(prefix.toLowerCase()) || kw.includes(prefix)),
        ...stlFunctions.filter(func => func.startsWith(prefix.toLowerCase()) || func.includes(prefix))
      ];
    } else {
      suggestions = [...cppKeywords.slice(0, 5), ...stlFunctions.slice(0, 5)];
    }

    // Limit to 10 suggestions and format them
    const formattedSuggestions = suggestions.slice(0, 10).map(item => ({
      label: item,
      kind: 'Keyword', // or 'Function', 'Variable', etc.
      detail: `C++ ${item}`,
      insertText: item
    }));

    console.log('Returning', formattedSuggestions.length, 'suggestions');
    
    res.status(200).json(formattedSuggestions);
  } catch (err) {
    console.error('Error getting suggestions:', err.message);
    res.status(500).json([]);
  }
}