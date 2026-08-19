/**
 * IntelliCPP Real-Time Static AST & Complexity Analysis Engine
 * Evaluates Big-O Time & Space complexity dynamically as the user types.
 */

export function analyzeComplexity(code = '', language = 'cpp') {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      timeComp: 'O(1)',
      timeReason: 'Empty Code Block',
      timeRank: 1,
      spaceComp: 'O(1)',
      spaceReason: 'Zero Dynamic Allocations',
      spaceRank: 1,
      status: 'PASS',
      details: ['No executable statements detected']
    };
  }

  // Strip comments and preprocessor directives to prevent false regex positives
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/#.*$/gm, '');

  const details = [];

  // ─────────────────────────────────────────────
  // 1. TIME COMPLEXITY ANALYSIS
  // ─────────────────────────────────────────────
  let timeComp = 'O(1)';
  let timeRank = 1; // 1: O(1), 2: O(log N), 3: O(N), 4: O(N log N), 5: O(N^2), 6: O(N^3), 7: O(2^N)
  let timeReason = 'Constant Time / Direct Memory Ops';

  // 1.1 Branching Recursion (e.g. fib(n-1) + fib(n-2) or recursive tree exploration)
  const branchingRecursionRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*-\s*1\)[^;{}]*\1\s*\([^)]*-\s*2\)/s;
  const isBranchingRecursion = branchingRecursionRegex.test(cleanCode);
  if (isBranchingRecursion) {
    timeComp = 'O(2ⁿ)';
    timeRank = 7;
    timeReason = 'Exponential (Branching Recursion 2ⁿ)';
    details.push('Branching recursion tree detected without dynamic programming');
  }

  // 1.2 Triple Nested Loops (O(N^3))
  const tripleNestedRegex = /(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)/s;
  if (timeRank < 6 && tripleNestedRegex.test(cleanCode)) {
    timeComp = 'O(N³)';
    timeRank = 6;
    timeReason = 'Cubic (3-Level Nested Loops)';
    details.push('3-level nested iteration loops (e.g. matrix multiplication / 3Sum)');
  }

  // 1.3 Double Nested Loops (O(N^2))
  const doubleNestedRegex = /(?:for|while)\s*\([^)]*\)\s*\{[^{}]*(?:for|while)\s*\([^)]*\)/s;
  const hasDoubleNested = doubleNestedRegex.test(cleanCode);

  // 1.4 Sorting Algorithms (O(N log N))
  const sortPatterns = [
    /\b(?:std::)?(?:sort|stable_sort|partial_sort)\s*\(/,
    /\b(?:std::)?ranges::sort\s*\(/,
    /\.sort\s*\(/,
    /\bsorted\s*\(/,
    /\b(?:merge_sort|quick_sort|heap_sort)\b/
  ];
  const hasSort = sortPatterns.some(p => p.test(cleanCode));

  // 1.5 Binary Search / Logarithmic Tree Ops
  const logPatterns = [
    /\b(?:std::)?(?:binary_search|lower_bound|upper_bound|equal_range)\s*\(/,
    new RegExp('\\b(?:for|while)\\s*\\([^;)]*;[^;)]*;\\s*[a-zA-Z_][a-zA-Z0-9_]*\\s*[*\\/]=\\s*[2-9]'),
    /\b(?:map|set|priority_queue)\b/
  ];
  const hasLogOps = logPatterns.some(p => p.test(cleanCode));

  // 1.6 Single Iteration Loop (O(N))
  const singleLoopRegex = /\b(?:for|while)\s*\(|\bfor_each\s*\(|\bstd::accumulate\s*\(/;
  const hasSingleLoop = singleLoopRegex.test(cleanCode);

  // Determine Dominant Time Complexity Rank
  if (timeRank < 6) {
    if (hasDoubleNested && hasSort) {
      timeComp = 'O(N² log N)';
      timeRank = 5.5;
      timeReason = 'Quadratic-Logarithmic (Nested Loop with Sorting)';
      details.push('Sorting operation executed inside nested loop');
    } else if (hasDoubleNested) {
      timeComp = 'O(N²)';
      timeRank = 5;
      timeReason = 'Quadratic (Pairwise / Nested Loop Scan)';
      details.push('2-level nested iteration loop detected');
    } else if (hasSort) {
      timeComp = 'O(N log N)';
      timeRank = 4;
      timeReason = 'Linearithmic (IntroSort / std::sort)';
      details.push('std::sort() comparison sort optimal bound: O(N log N)');
    } else if (hasSingleLoop && hasLogOps && /\b(?:binary_search|lower_bound|upper_bound|insert)\b/.test(cleanCode)) {
      timeComp = 'O(N log N)';
      timeRank = 4;
      timeReason = 'Linearithmic (Loop + Binary Search / Tree Insert)';
      details.push('Logarithmic search/insertion inside linear traversal');
    } else if (hasSingleLoop) {
      timeComp = 'O(N)';
      timeRank = 3;
      timeReason = 'Linear (Single-Pass Iteration)';
      details.push('Single traversal loop over elements');
    } else if (hasLogOps && /\b(?:binary_search|lower_bound|upper_bound)\b/.test(cleanCode)) {
      timeComp = 'O(log N)';
      timeRank = 2;
      timeReason = 'Logarithmic (Binary Search / Divide & Conquer)';
      details.push('Binary search lookup on sorted collection');
    }
  }

  // ─────────────────────────────────────────────
  // 2. SPACE COMPLEXITY ANALYSIS
  // ─────────────────────────────────────────────
  let spaceComp = 'O(1)';
  let spaceReason = 'O(1) Auxiliary (In-Place / Constant Memory)';
  let spaceRank = 1;

  // 2.1 Check 2D / Matrix Container Allocation (O(N^2))
  const matrix2DPatterns = [
    /\bvector\s*<\s*vector\s*<[^>]+>>/i,
    /\bvector\s*<\s*string\s*>/i,
    /\b[a-zA-Z_][a-zA-Z0-9_]*\s*\[\s*[^\]]+\s*\]\s*\[\s*[^\]]+\s*\]/,
    /\bnew\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\[\s*[^\]]+\s*\]\s*\[/
  ];
  if (matrix2DPatterns.some(p => p.test(cleanCode))) {
    spaceComp = 'O(N²)';
    spaceRank = 4;
    spaceReason = 'Quadratic (2D Matrix / Grid Dynamic Allocations)';
    details.push('2D dynamic container allocation (e.g. vector<vector<T>>)');
  }

  // 2.2 Check 1D Dynamic Containers (O(N))
  const linearContainerPatterns = [
    { regex: /\bvector\s*<([^>]+)>/ig, name: 'std::vector' },
    { regex: /\bunordered_map\s*<([^>]+)>/ig, name: 'std::unordered_map' },
    { regex: /\bmap\s*<([^>]+)>/ig, name: 'std::map' },
    { regex: /\bset\s*<([^>]+)>/ig, name: 'std::set' },
    { regex: /\bunordered_set\s*<([^>]+)>/ig, name: 'std::unordered_set' },
    { regex: /\bdeque\s*<([^>]+)>/ig, name: 'std::deque' },
    { regex: /\blist\s*<([^>]+)>/ig, name: 'std::list' },
    { regex: /\bstring\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/g, name: 'std::string' },
    { regex: /\bnew\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\[/g, name: 'Dynamic array new[]' },
    { regex: /\bmalloc\s*\(/g, name: 'malloc' }
  ];

  if (spaceRank < 4) {
    const matchedContainers = [];
    for (const item of linearContainerPatterns) {
      const matches = cleanCode.match(item.regex);
      if (matches && matches.length > 0) {
        matchedContainers.push(`${item.name}`);
      }
    }

    if (matchedContainers.length > 0) {
      spaceComp = 'O(N)';
      spaceRank = 3;
      spaceReason = `Linear Heap Storage (${matchedContainers.slice(0, 2).join(', ')})`;
      details.push(`Dynamic heap container storage: ${matchedContainers.join(', ')}`);
    } else if (isBranchingRecursion) {
      spaceComp = 'O(N)';
      spaceRank = 3;
      spaceReason = 'Linear Call Stack (Recursion Depth O(N))';
      details.push('Call stack frame depth proportional to N');
    }
  }

  // 2.3 Status calculation
  let status = 'OPTIMAL';
  if (timeRank >= 6 || spaceRank >= 4) {
    status = 'HIGH';
  } else if (timeRank >= 5) {
    status = 'WARN';
  } else if (timeRank === 4) {
    status = 'OPTIMAL'; // std::sort O(N log N) is optimal comparison sort bound!
  } else {
    status = 'PASS';
  }

  return {
    timeComp,
    timeReason,
    timeRank,
    spaceComp,
    spaceReason,
    spaceRank,
    status,
    details
  };
}
