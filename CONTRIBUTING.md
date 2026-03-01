# Contributing to IntelliCPP

First off, thank you for considering contributing to IntelliCPP! It's people like you that make IntelliCPP such a great tool.

## 🎯 What We're Looking For

We welcome contributions of all kinds:
- **Bug fixes** - Help improve stability and performance
- **New features** - Enhance the IntelliSense capabilities
- **Documentation** - Improve guides, examples, and API docs
- **Performance improvements** - Optimize the trie and tokenizer
- **Test coverage** - Add more comprehensive tests
- **UI/UX enhancements** - Improve the Monaco Editor integration

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/IntelliCPP.git
   cd IntelliCPP
   ```
3. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-awesome-feature
   ```
4. **Install dependencies**:
   ```bash
   npm run install-deps
   ```
5. **Build the project**:
   ```bash
   npm run build
   ```

## 📋 Development Workflow

### 📁 Project Structure
```
IntelliCPP/
├── backend/          # C++20 core engine
│   ├── include/      # Public headers
│   ├── src/          # Implementation files
│   └── CMakeLists.txt
├── frontend/         # React + Monaco Editor
│   ├── src/
│   │   └── components/
│   └── package.json
├── data/             # STL data files
├── tests/            # C++ and JS tests
├── dist/             # Build outputs
└── package.json      # Root configuration
```

### 🛠️ Code Quality Standards

#### C++ Backend (92%+ Test Coverage Required)
- **Language**: C++20 with modern features
- **Style**: Follow [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
- **Memory Management**: Use smart pointers (`std::unique_ptr`, `std::shared_ptr`)
- **Performance**: Keep trie search under 2ms, total latency under 28ms

```cpp
// ✅ Good
auto node = std::make_shared<TrieNode>();
std::vector<std::string> results = trie.search("vec", 10);

// ❌ Avoid
TrieNode* node = new TrieNode();  // Raw pointers
delete node;                      // Manual memory management
```

#### JavaScript/React Frontend
- **Framework**: React 18 with functional components
- **Style**: Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- **Components**: Use hooks and functional components
- **Performance**: Optimize re-renders, use React.memo when appropriate

```jsx
// ✅ Good
const SuggestionPopup = React.memo(({ suggestions, onSelect }) => {
  return (
    <div className="suggestion-popup">
      {suggestions.map((suggestion, index) => (
        <div key={index} onClick={() => onSelect(suggestion)}>
          {suggestion}
        </div>
      ))}
    </div>
  );
});

// ❌ Avoid
class SuggestionPopup extends Component {
  // Class components unless absolutely necessary
}
```

### 🧪 Testing Requirements

#### C++ Tests (GTest)
```bash
# Run C++ tests
npm run test:cpp

# Run specific test file
npm run test:cpp -- test_trie.cpp

# Generate coverage report
npm run test:cpp -- --coverage
```

#### JavaScript Tests (Jest)
```bash
# Run frontend tests
npm run test:frontend

# Run tests in watch mode
npm run test:frontend -- --watch

# Generate coverage
npm run test:frontend -- --coverage
```

#### Test Coverage Standards
- **Minimum**: 92% for C++ backend
- **Target**: 100% for new features
- **Requirements**: 
  - Unit tests for all public APIs
  - Integration tests for core workflows
  - Edge case coverage

### 📝 Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding/improving tests
- `perf`: Performance improvements
- `chore`: Maintenance tasks

**Examples:**
```
feat(trie): implement compression algorithm for memory optimization

- Added LRU-based node compression
- Reduced memory usage by 30%
- Maintained O(L) search complexity

fix(tokenizer): handle template syntax parsing

- Fixed parsing of nested templates like vector<vector<int>>
- Added comprehensive test cases
- Resolves issue #42

docs(readme): update performance benchmarks

- Added new latency measurements
- Updated STL coverage statistics
- Improved installation instructions
```

### 🔄 Pull Request Process

1. **Before submitting**:
   - [ ] Run all tests: `npm test`
   - [ ] Check code formatting: `npm run format`
   - [ ] Verify linting: `npm run lint`
   - [ ] Update documentation if needed
   - [ ] Add tests for new functionality

2. **Create PR**:
   - Use descriptive title
   - Link related issues
   - Provide detailed description
   - Include before/after screenshots (for UI changes)

3. **Code Review**:
   - Address all feedback
   - Maintain professional communication
   - Be open to suggestions
   - Explain technical decisions

4. **Merge Requirements**:
   - All CI checks pass
   - Code coverage maintained ≥92%
   - Approved by maintainers
   - Properly rebased on main branch

### 📊 Performance Benchmarks

All contributions should maintain or improve these metrics:

| Metric | Target | Current |
|--------|--------|---------|
| Trie Search | < 2ms | ~1.5ms |
| Tokenization | < 5ms | ~3ms |
| Total Latency | < 28ms | ~25ms |
| Memory Usage | < 10MB | ~5MB |
| Test Coverage | ≥ 92% | 92% |

Use the built-in profiler:
```bash
# Profile C++ performance
npm run profile:backend

# Profile frontend performance
npm run profile:frontend
```

## 🐛 Reporting Issues

### Bug Reports
When reporting bugs, please include:

```markdown
**Environment:**
- OS: [e.g., Ubuntu 20.04, Windows 11, macOS 12]
- Node.js: [version]
- C++ Compiler: [GCC/Clang version]
- IntelliCPP Version: [git commit hash]

**Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [What you expected to happen]
4. [What actually happened]

**Code Sample:**
```cpp
// Minimal code to reproduce the issue
```

**Additional Context:**
[Any additional information, screenshots, logs]
```

### Feature Requests
For new features, provide:

- **Use Case**: Why is this feature needed?
- **Problem**: What problem does it solve?
- **Alternatives**: Have you considered other approaches?
- **Implementation**: Any ideas on how to implement it?
- **Impact**: How will this improve the project?

## 🎨 UI/UX Contributions

### Design Principles
- **Consistency**: Follow existing design patterns
- **Accessibility**: Ensure WCAG 2.1 AA compliance
- **Performance**: Optimize for 60fps interactions
- **Responsive**: Work on all screen sizes

### CSS Guidelines
- Use the existing glassmorphism theme
- Follow BEM naming convention
- Mobile-first approach
- CSS variables for theming

## 📚 Documentation

### What to Document
- New APIs and functions
- Configuration options
- Installation procedures
- Troubleshooting guides
- Architecture decisions

### Documentation Style
- Clear, concise language
- Code examples for complex concepts
- Before/after comparisons
- Links to related sections

### Where to Add Documentation
- **README.md**: High-level overview and quick start
- **CONTRIBUTING.md**: This file (contribution guidelines)
- **Inline comments**: Complex algorithms and edge cases
- **Wiki**: Detailed guides and tutorials

## 🏆 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **GitHub contributors** list
- **Release notes** for significant contributions
- **Social media** shoutouts for major features

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on technical merit
- Maintain professional communication

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community chat
- **Email**: For sensitive matters (see README)

## 🚀 Getting Help

Need help with your contribution?
- Check the [README.md](README.md) for setup instructions
- Review existing [issues](https://github.com/CodeAXwOrlD/IntelliCPP/issues)
- Look at [merged PRs](https://github.com/CodeAXwOrlD/IntelliCPP/pulls?q=is%3Apr+is%3Amerged) for examples
- Ask questions in [GitHub Discussions](https://github.com/CodeAXwOrlD/IntelliCPP/discussions)

## 📄 License

By contributing to IntelliCPP, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making IntelliCPP better!** 🙏

Questions? Feel free to [open an issue](https://github.com/CodeAXwOrlD/IntelliCPP/issues/new) or reach out to the maintainers.