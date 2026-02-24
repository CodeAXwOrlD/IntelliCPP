#include <gtest/gtest.h>
#include "../include/trie.h"
#include <vector>

using namespace codeflow;

class TrieTest : public ::testing::Test {
protected:
    Trie trie;
    
    void SetUp() override {
        // Load common C++ keywords
        trie.insert("vector", 100);
        trie.insert("push_back", 95);
        trie.insert("pop_back", 90);
        trie.insert("size", 88);
        trie.insert("empty", 85);
        trie.insert("clear", 80);
        trie.insert("front", 78);
        trie.insert("back", 75);
    }
};

TEST_F(TrieTest, InsertAndSearch) {
    auto results = trie.search("vec", 8);
    EXPECT_GT(results.size(), 0);
    EXPECT_EQ(results[0], "vector");
}

TEST_F(TrieTest, SearchEmpty) {
    auto results = trie.search("xyz", 8);
    EXPECT_EQ(results.size(), 0);
}

TEST_F(TrieTest, SearchWithLimit) {
    auto results = trie.search("", 8);
    EXPECT_LE(results.size(), 8);
}

TEST_F(TrieTest, PrefixMatch) {
    auto results = trie.search("p", 8);
    EXPECT_TRUE(std::any_of(results.begin(), results.end(),
        [](const std::string& s) { return s == "push_back"; }));
}

TEST_F(TrieTest, FrequencyRanking) {
    trie.insert("push", 200);  // Higher frequency
    auto results = trie.search("pu", 8);
    EXPECT_EQ(results[0], "push");
}

TEST_F(TrieTest, GetAllWords) {
    auto words = trie.getAllWords();
    EXPECT_EQ(words.size(), 8);
}

TEST_F(TrieTest, LargeDataset) {
    Trie largeTrie;
    std::vector<std::string> keywords = {
        "algorithm", "array", "bitset", "deque", "forward_list", "list",
        "map", "queue", "set", "stack", "unordered_map", "unordered_set",
        "vector", "string", "iostream", "fstream", "sstream", "iomanip"
    };
    
    for (const auto& kw : keywords) {
        largeTrie.insert(kw);
    }
    
    auto results = largeTrie.search("un", 10);
    EXPECT_GT(results.size(), 0);
}

TEST_F(TrieTest, CaseSensitivity) {
    Trie caseTrie;
    caseTrie.insert("Vector");
    auto results = caseTrie.search("vec", 8);
    EXPECT_EQ(results.size(), 0);  // Should not match (case-sensitive)
}
