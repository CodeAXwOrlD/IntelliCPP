#pragma once

#include <string>
#include <vector>
#include <unordered_map>

namespace codeflow {

struct Token {
    enum class Type {
        IDENTIFIER,
        KEYWORD,
        OPERATOR,
        PUNCTUATION,
        LITERAL,
        WHITESPACE,
        UNKNOWN
    };
    
    Type type;
    std::string value;
    int position;
};

class Tokenizer {
public:
    Tokenizer();
    
    // Tokenize C++ code
    std::vector<Token> tokenize(const std::string& code);
    
    // Get symbol table (variable names and their types)
    std::unordered_map<std::string, std::string> getSymbolTable() const;
    
    // Parse type from assignment (e.g., "vector v" -> extract "vector")
    std::string extractTypeFromContext(
        const std::string& code,
        int cursorPosition
    );
    
private:
    std::unordered_map<std::string, std::string> symbolTable;
    std::unordered_map<std::string, bool> keywords;
    
    void initializeKeywords();
    bool isKeyword(const std::string& word) const;
    bool isIdentifierStart(char c) const;
    bool isIdentifierPart(char c) const;
    bool isOperator(char c) const;
};

}  // namespace codeflow
