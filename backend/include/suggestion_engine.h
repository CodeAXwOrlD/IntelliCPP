#pragma once

#include "tokenizer.h"
#include "trie.h"
#include <future>
#include <mutex>
#include <string>
#include <thread>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace codeflow
{

  struct Suggestion
  {
    std::string text;
    std::string type; // "method", "variable", "keyword", etc.
    std::string description;
    float score; // Ranking score (frequency + recency)
  };

  class SuggestionEngine
  {
  public:
    SuggestionEngine();

    // Initialize with symbol data
    void loadSTLData(const std::string &stlJsonPath);
    void loadKeywords(const std::string &keywordsPath);

    // Main API: Get contextual suggestions
    std::vector<Suggestion> getSuggestions(const std::string &prefix,
                                           const std::string &contextType,
                                           const std::string &code,
                                           int cursorPosition,
                                           int maxResults = 10);

    // Update symbol table from code
    void updateSymbols(const std::string &code);

    // Get symbol count
    int getSymbolCount() const;

    // Get included libraries
    std::vector<std::string> getIncludedLibraries() const;

    // Get symbol table
    std::unordered_map<std::string, std::string> getSymbolTable() const;

    // Validate if a type has included header
    bool isHeaderIncluded(const std::string &type) const;

  private:
    Trie trie;
    Tokenizer tokenizer;
    std::unordered_map<std::string, std::vector<std::string>> typeToMethods;
    std::unordered_map<std::string, std::string> symbolTable;
    std::unordered_set<std::string> includedLibraries;
    std::mutex mutex;

    // Context-aware filtering
    std::vector<std::string>
    filterByContext(const std::vector<std::string> &candidates,
                    const std::string &contextType);

    // Ranking with frequency + recency
    void rankSuggestions(std::vector<Suggestion> &suggestions,
                         bool useML = false);

    // Parse JSON STL data
    void parseSTLJson(const std::string &jsonData);

    // Extract object name before dot
    std::string extractObjectName(const std::string &code, int cursorPosition);

    // Get type for object
    std::string getTypeForObject(const std::string &objectName) const;
  };

} // namespace codeflow
