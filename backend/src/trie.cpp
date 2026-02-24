#include "trie.h"
#include <algorithm>
#include <chrono>

namespace codeflow {

Trie::Trie() {
    root = std::make_shared<TrieNode>();
}

void Trie::insert(const std::string& word, int frequency, long long lastUsed) {
    auto node = root;
    for (char c : word) {
        if (!node->children.count(c)) {
            node->children[c] = std::make_shared<TrieNode>();
        }
        node = node->children[c];
    }
    node->word = word;
    node->isEnd = true;
    node->frequency = frequency;
    node->lastUsed = lastUsed ? lastUsed : std::chrono::system_clock::now().time_since_epoch().count();
}

std::vector<std::string> Trie::search(const std::string& prefix, int maxResults) {
    auto node = root;
    
    // Navigate to prefix
    for (char c : prefix) {
        if (!node->children.count(c)) {
            return {};  // No results
        }
        node = node->children[c];
    }
    
    // DFS from prefix node
    std::vector<std::string> results;
    int count = 0;
    return dfs(node, count, maxResults);
}

std::vector<std::string> Trie::dfs(
    std::shared_ptr<TrieNode> node,
    int& count,
    int maxResults) {
    
    std::vector<std::string> results;
    
    if (!node) return results;
    
    if (node->isEnd && count < maxResults) {
        results.push_back(node->word);
        count++;
    }
    
    // Sort children by frequency for better ranking
    std::vector<std::pair<char, std::shared_ptr<TrieNode>>> sorted(
        node->children.begin(),
        node->children.end()
    );
    std::sort(sorted.begin(), sorted.end(),
        [](const auto& a, const auto& b) {
            return a.second->frequency > b.second->frequency;
        }
    );
    
    for (const auto& [c, child] : sorted) {
        if (count >= maxResults) break;
        auto subResults = dfs(child, count, maxResults);
        results.insert(results.end(), subResults.begin(), subResults.end());
    }
    
    return results;
}

std::vector<std::string> Trie::getAllWords() const {
    std::vector<std::string> results;
    std::function<void(std::shared_ptr<TrieNode>)> traverse;
    traverse = [&](std::shared_ptr<TrieNode> node) {
        if (!node) return;
        if (node->isEnd) {
            results.push_back(node->word);
        }
        for (const auto& [c, child] : node->children) {
            traverse(child);
        }
    };
    traverse(root);
    return results;
}

void Trie::loadWords(const std::vector<std::string>& words) {
    for (const auto& word : words) {
        insert(word);
    }
}

}  // namespace codeflow
