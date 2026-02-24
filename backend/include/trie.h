#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>

namespace codeflow {

struct TrieNode {
    std::unordered_map<char, std::shared_ptr<TrieNode>> children;
    std::string word;
    bool isEnd = false;
    int frequency = 0;
    long long lastUsed = 0;
};

class Trie {
public:
    Trie();
    
    // Insert a word with frequency and metadata
    void insert(const std::string& word, int frequency = 1, long long lastUsed = 0);
    
    // Search for prefix and return ranked suggestions
    std::vector<std::string> search(
        const std::string& prefix,
        int maxResults = 8
    );
    
    // Get all words (for loading from data)
    std::vector<std::string> getAllWords() const;
    
    // Load words from vector
    void loadWords(const std::vector<std::string>& words);
    
private:
    std::shared_ptr<TrieNode> root;
    std::vector<std::string> dfs(
        std::shared_ptr<TrieNode> node,
        int& count,
        int maxResults
    );
};

}  // namespace codeflow
