#include <gtest/gtest.h>
#include "../include/tokenizer.h"
#include <vector>

using namespace codeflow;

class TokenizerTest : public ::testing::Test {
protected:
    Tokenizer tokenizer;
};

TEST_F(TokenizerTest, BasicTokenization) {
    auto tokens = tokenizer.tokenize("vector v;");
    EXPECT_GT(tokens.size(), 0);
    EXPECT_EQ(tokens[0].value, "vector");
    EXPECT_EQ(tokens[0].type, Token::Type::KEYWORD);
}

TEST_F(TokenizerTest, IdentifierRecognition) {
    auto tokens = tokenizer.tokenize("myVector");
    EXPECT_GT(tokens.size(), 0);
    EXPECT_EQ(tokens[0].type, Token::Type::IDENTIFIER);
}

TEST_F(TokenizerTest, KeywordRecognition) {
    auto tokens = tokenizer.tokenize("int x = 5;");
    bool hasIntKeyword = false;
    for (const auto& token : tokens) {
        if (token.value == "int" && token.type == Token::Type::KEYWORD) {
            hasIntKeyword = true;
            break;
        }
    }
    EXPECT_TRUE(hasIntKeyword);
}

TEST_F(TokenizerTest, LiteralRecognition) {
    auto tokens = tokenizer.tokenize("42");
    EXPECT_GT(tokens.size(), 0);
    EXPECT_EQ(tokens[0].type, Token::Type::LITERAL);
}

TEST_F(TokenizerTest, StringRecognition) {
    auto tokens = tokenizer.tokenize("\"hello world\"");
    EXPECT_GT(tokens.size(), 0);
    EXPECT_EQ(tokens[0].type, Token::Type::LITERAL);
}

TEST_F(TokenizerTest, OperatorRecognition) {
    auto tokens = tokenizer.tokenize("a + b");
    bool hasOperator = false;
    for (const auto& token : tokens) {
        if (token.value == "+" && token.type == Token::Type::OPERATOR) {
            hasOperator = true;
            break;
        }
    }
    EXPECT_TRUE(hasOperator);
}

TEST_F(TokenizerTest, TypeExtraction) {
    std::string code = "vector<int> v = something;";
    std::string type = tokenizer.extractTypeFromContext(code, code.length());
    EXPECT_FALSE(type.empty());
}

TEST_F(TokenizerTest, ComplexCode) {
    std::string code = R"(
        std::vector<int> myVector;
        myVector.push_back(42);
        for (int i = 0; i < myVector.size(); ++i) {
            std::cout << myVector[i] << std::endl;
        }
    )";
    
    auto tokens = tokenizer.tokenize(code);
    EXPECT_GT(tokens.size(), 15);
}

TEST_F(TokenizerTest, WhitespaceHandling) {
    auto tokens = tokenizer.tokenize("int   x   =   5");
    EXPECT_EQ(tokens[0].value, "int");
    EXPECT_EQ(tokens[1].value, "x");
}

TEST_F(TokenizerTest, MultiCharOperators) {
    auto tokens = tokenizer.tokenize("a << b");
    bool found = false;
    for (const auto& token : tokens) {
        if (token.value == "<") {
            found = true;
            break;
        }
    }
    EXPECT_TRUE(found);
}
