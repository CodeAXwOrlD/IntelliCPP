#include "../include/suggestion_engine.h"
#include <algorithm>
#include <chrono>
#include <fstream>
#include <regex>
#include <sstream>

namespace codeflow {

SuggestionEngine::SuggestionEngine() {
  // Type methods are dynamically loaded via loadSTLData
}

void SuggestionEngine::loadSTLData(const std::string &stlJsonPath) {
  std::ifstream file(stlJsonPath);
  if (!file.is_open())
    return;

  std::stringstream buffer;
  buffer << file.rdbuf();
  parseSTLJson(buffer.str());
}

void SuggestionEngine::loadKeywords(const std::string &keywordsPath) {
  std::ifstream file(keywordsPath);
  if (!file.is_open())
    return;

  std::string line;
  std::vector<std::string> keywords;
  while (std::getline(file, line)) {
    if (!line.empty() && line[0] != '#') {
      trie.insert(line);
      keywords.push_back(line);
    }
  }
}

std::string SuggestionEngine::extractObjectName(const std::string &code,
                                                int cursorPosition) {
  // Find the dot position near cursor
  int dotPos = cursorPosition - 1;
  while (dotPos >= 0 && code[dotPos] != '.') {
    dotPos--;
  }

  if (dotPos < 0)
    return "";

  // Extract identifier before dot
  int idStart = dotPos - 1;
  while (idStart >= 0 &&
         (std::isalnum(code[idStart]) || code[idStart] == '_')) {
    idStart--;
  }
  idStart++;

  if (idStart >= dotPos)
    return "";
  return code.substr(idStart, dotPos - idStart);
}

std::string
SuggestionEngine::getTypeForObject(const std::string &objectName) const {
  auto it = symbolTable.find(objectName);
  if (it != symbolTable.end()) {
    return it->second;
  }
  return "";
}

bool SuggestionEngine::isHeaderIncluded(const std::string &type) const {
  return includedLibraries.count(type) > 0;
}

std::vector<std::string> SuggestionEngine::getIncludedLibraries() const {
  std::vector<std::string> result(includedLibraries.begin(),
                                  includedLibraries.end());
  return result;
}

std::unordered_map<std::string, std::string>
SuggestionEngine::getSymbolTable() const {
  return symbolTable;
}

std::vector<Suggestion> SuggestionEngine::getSuggestions(
    const std::string &prefix, const std::string &contextType,
    const std::string &code, int cursorPosition, int maxResults) {

  std::lock_guard<std::mutex> lock(mutex);

  std::string actualType = contextType;

  // If contextType is empty, try to extract object name from code
  if (contextType.empty() && cursorPosition > 0) {
    std::string objectName = extractObjectName(code, cursorPosition);
    if (!objectName.empty()) {
      actualType = getTypeForObject(objectName);
    }
  } else if (!contextType.empty() && symbolTable.count(contextType)) {
    // contextType is variable name, resolve to actual type
    actualType = symbolTable.at(contextType);
  }

  // ✅ RULE 1: Check if the required library is included
  if (!actualType.empty() && typeToMethods.count(actualType)) {
    if (!includedLibraries.count(actualType)) {
      return {}; // ❌ Required header not included - return empty
    }
  }

  // If we have a specific context type with methods defined, return those
  // directly
  if (!actualType.empty() && typeToMethods.count(actualType)) {
    const auto &methods = typeToMethods.at(actualType);
    std::vector<Suggestion> suggestions;

    // Filter by prefix if provided
    for (const auto &method : methods) {
      if (prefix.empty() || method.find(prefix) == 0) {
        suggestions.push_back({method, "method", "", 0.0f});
      }
    }

    // ✅ RULE 4: Rank and return top results
    rankSuggestions(suggestions);
    if (suggestions.size() > (size_t)maxResults) {
      suggestions.resize(maxResults);
    }

    return suggestions;
  }

  // Fallback: Get raw trie results (for keywords and non-typed suggestions)
  auto raw = trie.search(prefix, maxResults * 2);

  // Convert to Suggestion objects
  std::vector<Suggestion> suggestions;
  for (const auto &text : raw) {
    suggestions.push_back({text, "keyword", "", 0.0f});
  }

  // ✅ RULE 4: Rank and return top results
  rankSuggestions(suggestions);
  if (suggestions.size() > (size_t)maxResults) {
    suggestions.resize(maxResults);
  }

  return suggestions;
}

void SuggestionEngine::updateSymbols(const std::string &code) {
  std::lock_guard<std::mutex> lock(mutex);

  symbolTable.clear();
  includedLibraries.clear();

  // ✅ Parse includes: #include <vector>, #include <stack>, etc.
  std::regex includeRegex(R"(#include\s*<\s*([a-z_]+)\s*>)");
  for (std::sregex_iterator it(code.begin(), code.end(), includeRegex), end;
       it != end; ++it) {
    includedLibraries.insert((*it)[1].str());
  }

  // ✅ Parse variable declarations - specifically for STL containers
  // Patterns: vector<int> v;  map<int,int> m;  stack<double> s; string s;
  // list<int> lst;
  std::regex varDecl(
      R"(\b(vector|stack|queue|deque|map|unordered_map|set|unordered_set|string|list|forward_list|priority_queue|array|bitset)(?:<[^>]*>)?\s+(\w+)\s*[=;({])");
  for (std::sregex_iterator it(code.begin(), code.end(), varDecl), end;
       it != end; ++it) {
    std::string type = (*it)[1].str();
    std::string var = (*it)[2].str();
    symbolTable[var] = type;
  }
}

int SuggestionEngine::getSymbolCount() const { return symbolTable.size(); }

std::vector<std::string>
SuggestionEngine::filterByContext(const std::vector<std::string> &candidates,
                                  const std::string &contextType) {

  if (contextType.empty()) {
    return candidates;
  }

  // ✅ RULE 7: Filter to methods of the specified type ONLY
  if (typeToMethods.count(contextType)) {
    const auto &methods = typeToMethods.at(contextType);
    std::vector<std::string> filtered;

    for (const auto &candidate : candidates) {
      if (std::find(methods.begin(), methods.end(), candidate) !=
          methods.end()) {
        filtered.push_back(candidate);
      }
    }
    return filtered;
  }

  return candidates;
}

void SuggestionEngine::rankSuggestions(std::vector<Suggestion> &suggestions,
                                       bool useML) {
  // ✅ RULE 3: Simple ranking - shorter method names first (more common
  // pattern)
  std::sort(suggestions.begin(), suggestions.end(),
            [](const Suggestion &a, const Suggestion &b) {
              return a.text.length() < b.text.length();
            });

  // Assign scores (decay based on position)
  for (size_t i = 0; i < suggestions.size(); ++i) {
    suggestions[i].score = 1.0f - (i * 0.1f);
  }
}

void SuggestionEngine::parseSTLJson(const std::string &jsonData) {
  // Parse JSON array format: "container": ["method1", "method2", ...]
  // Handle both single-line and multi-line arrays

  typeToMethods.clear();

  // First, find all container keys
  std::regex containerRegex(R"(\"(\w+)\"\s*:\s*\[)");

  std::sregex_iterator it(jsonData.begin(), jsonData.end(), containerRegex);
  std::sregex_iterator end;

  while (it != end) {
    std::string container = (*it)[1].str();
    size_t arrayStart = it->position() + it->length();

    // Find the closing bracket for this array
    int bracketCount = 1;
    size_t pos = arrayStart;
    size_t arrayEnd = arrayStart;

    while (pos < jsonData.length() && bracketCount > 0) {
      if (jsonData[pos] == '[')
        bracketCount++;
      else if (jsonData[pos] == ']')
        bracketCount--;

      if (bracketCount == 0) {
        arrayEnd = pos;
        break;
      }
      pos++;
    }

    // Extract array content
    std::string arrayContent =
        jsonData.substr(arrayStart, arrayEnd - arrayStart);

    // Parse individual method names from the array content
    std::regex methodRegex(R"(\"([^\"]+)\")");
    std::sregex_iterator methodIt(arrayContent.begin(), arrayContent.end(),
                                  methodRegex);
    std::sregex_iterator methodEnd;

    while (methodIt != methodEnd) {
      std::string method = (*methodIt)[1].str();
      typeToMethods[container].push_back(method);
      trie.insert(method); // Insert methods into Trie for fast prefix search
      ++methodIt;
    }

    ++it;
  }
}

} // namespace codeflow
