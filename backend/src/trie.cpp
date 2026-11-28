#include "../include/trie.h"
#include <algorithm>
#include <chrono>
#include <functional>

namespace codeflow {

Trie::Trie() { root = std::make_shared<TrieNode>(); }

void Trie::insert(const std::string &word, int frequency, long long lastUsed) {
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
  node->lastUsed =
      lastUsed ? lastUsed
               : std::chrono::system_clock::now().time_since_epoch().count();
}

std::vector<std::string> Trie::search(const std::string &prefix,
                                      int maxResults) {
  auto node = root;

  for (char c : prefix) {
    auto it = node->children.find(c);
    if (it == node->children.end()) {
      return {};
    }
    node = it->second;
  }

  std::vector<std::string> results;
  if (maxResults > 0) {
    results.reserve(static_cast<size_t>(maxResults));
    dfs(node, results, maxResults);
  }
  return results;
}

void Trie::dfs(const std::shared_ptr<TrieNode> &node,
               std::vector<std::string> &results, int maxResults) {
  if (!node || static_cast<int>(results.size()) >= maxResults)
    return;

  if (node->isEnd) {
    results.push_back(node->word);
    if (static_cast<int>(results.size()) >= maxResults)
      return;
  }

  if (node->children.size() <= 1) {
    for (const auto &[c, child] : node->children) {
      dfs(child, results, maxResults);
    }
    return;
  }

  std::vector<std::pair<int, std::shared_ptr<TrieNode>>> sorted;
  sorted.reserve(node->children.size());
  for (const auto &[c, child] : node->children) {
    sorted.emplace_back(child->frequency, child);
  }
  std::sort(sorted.begin(), sorted.end(), [](const auto &a, const auto &b) {
    return a.first > b.first;
  });

  for (const auto &[freq, child] : sorted) {
    if (static_cast<int>(results.size()) >= maxResults)
      break;
    dfs(child, results, maxResults);
  }
}

std::vector<std::string> Trie::getAllWords() const {
  std::vector<std::string> results;
  std::function<void(std::shared_ptr<TrieNode>)> traverse;
  traverse = [&](std::shared_ptr<TrieNode> node) {
    if (!node)
      return;
    if (node->isEnd) {
      results.push_back(node->word);
    }
    for (const auto &[c, child] : node->children) {
      traverse(child);
    }
  };
  traverse(root);
  return results;
}

void Trie::loadWords(const std::vector<std::string> &words) {
  for (const auto &word : words) {
    insert(word);
  }
}

} // namespace codeflow
