# Contributing to CodeFlow Autocomplete

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/codeflow-autocomplete.git`
3. Create feature branch: `git checkout -b feature/amazing-feature`
4. Install dependencies: `npm install && npm run build:backend`

## Development Workflow

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing

```bash
# Run all tests
npm test

# Run specific test
npm test test_trie.cpp

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Commit Standards

Use conventional commits:

```
type(scope): description

feat(trie): add compression algorithm
fix(tokenizer): handle template syntax
docs(readme): update benchmark section
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features (maintain 92%+ coverage)
3. Ensure all tests pass locally: `npm test`
4. Rebase on main: `git rebase origin/main`
5. Push to fork and create PR
6. Wait for CI/CD pipeline to pass
7. Request review from maintainers

## Coding Standards

### C++

- Use C++20 features
- Follow Google C++ style guide
- Use smart pointers, avoid raw `new`/`delete`
- Add comments for complex algorithms

```cpp
// Good
auto node = std::make_shared<TrieNode>();

// Avoid
TrieNode* node = new TrieNode();
```

### JavaScript

- Use functional components
- Follow AirBnB JavaScript style
- No console.log in production

```jsx
// Good
const SuggestionPopup = ({ suggestions, onSelect }) => {
  return <div>...</div>;
};

// Avoid
class SuggestionPopup extends Component {
  // ...
}
```

## Architecture Guidelines

### Adding Features

1. **Backend Feature**: Add to C++ files, update tests
2. **Frontend Feature**: Add React component, add CSS
3. **Documentation**: Update README.md

### Directory Structure

- `backend/include/` - Public headers
- `backend/src/` - Implementation
- `frontend/src/components/` - React components
- `data/` - Data files only
- `tests/` - All tests

## Performance Optimization

- Keep Trie search under 2ms
- Keep tokenization under 5ms
- Total latency goal: 28ms

Use profiling:
```bash
# Linux
perf record ./test_trie
perf report

# macOS
Instruments
```

## Documentation

Add JSDoc/comments for:
- Public APIs
- Complex algorithms
- Edge cases
- Performance implications

```cpp
/// Search for prefix in trie
/// \param prefix Search string
/// \param maxResults Maximum results to return
/// \return Sorted vector of suggestions O(L + M)
std::vector<std::string> search(
    const std::string& prefix,
    int maxResults = 8
);
```

## Version Bumping

```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

## Release Process

1. Update version: `npm version minor`
2. Update CHANGELOG.md
3. Push: `git push --tags`
4. Create GitHub release
5. Deploy to production

## Reporting Bugs

Include in bug report:
- OS and version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs

## Feature Requests

Provide:
- Use case description
- Why it's important
- Proposed implementation (optional)
- Acceptance criteria

## Code Review Comments

Keep discussions professional:
- Suggest improvements, don't demand
- Explain reasoning
- Offer alternatives
- Give praise for good code

## License

By contributing, you agree your code is licensed under MIT.

---

**Questions?** Open an issue or email maintainers.

**Thank you for contributing!** 🙏
