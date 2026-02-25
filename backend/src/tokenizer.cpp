#include "../include/tokenizer.h"
#include <cctype>
#include <regex>
#include <sstream>

namespace codeflow {

Tokenizer::Tokenizer() { initializeKeywords(); }

void Tokenizer::initializeKeywords() {
  keywords = {{"if", true},        {"else", true},     {"for", true},
              {"while", true},     {"do", true},       {"switch", true},
              {"case", true},      {"default", true},  {"break", true},
              {"continue", true},  {"return", true},   {"int", true},
              {"float", true},     {"double", true},   {"char", true},
              {"bool", true},      {"void", true},     {"long", true},
              {"short", true},     {"unsigned", true}, {"signed", true},
              {"const", true},     {"volatile", true}, {"static", true},
              {"extern", true},    {"auto", true},     {"register", true},
              {"class", true},     {"struct", true},   {"union", true},
              {"enum", true},      {"typedef", true},  {"using", true},
              {"namespace", true}, {"template", true}, {"typename", true},
              {"virtual", true},   {"public", true},   {"private", true},
              {"protected", true}, {"friend", true},   {"new", true},
              {"delete", true},    {"vector", true},   {"map", true},
              {"set", true},       {"string", true},   {"iostream", true},
              {"algorithm", true}};
}

std::vector<Token> Tokenizer::tokenize(const std::string &code) {
  std::vector<Token> tokens;
  size_t pos = 0;

  while (pos < code.length()) {
    if (std::isspace(code[pos])) {
      pos++;
      continue;
    }

    if (isIdentifierStart(code[pos])) {
      size_t start = pos;
      while (pos < code.length() && isIdentifierPart(code[pos])) {
        pos++;
      }
      std::string word = code.substr(start, pos - start);
      Token::Type type =
          isKeyword(word) ? Token::Type::KEYWORD : Token::Type::IDENTIFIER;
      tokens.push_back({type, word, static_cast<int>(start)});
    } else if (std::isdigit(code[pos])) {
      size_t start = pos;
      while (pos < code.length() &&
             (std::isdigit(code[pos]) || code[pos] == '.')) {
        pos++;
      }
      tokens.push_back({Token::Type::LITERAL, code.substr(start, pos - start),
                        static_cast<int>(start)});
    } else if (code[pos] == '"' || code[pos] == '\'') {
      char quote = code[pos];
      size_t start = pos;
      pos++;
      while (pos < code.length() && code[pos] != quote) {
        if (code[pos] == '\\')
          pos++;
        pos++;
      }
      if (pos < code.length())
        pos++;
      tokens.push_back({Token::Type::LITERAL, code.substr(start, pos - start),
                        static_cast<int>(start)});
    } else if (isOperator(code[pos])) {
      tokens.push_back({Token::Type::OPERATOR, std::string(1, code[pos]),
                        static_cast<int>(pos)});
      pos++;
    } else {
      tokens.push_back({Token::Type::PUNCTUATION, std::string(1, code[pos]),
                        static_cast<int>(pos)});
      pos++;
    }
  }

  return tokens;
}

std::unordered_map<std::string, std::string> Tokenizer::getSymbolTable() const {
  return symbolTable;
}

std::string Tokenizer::extractTypeFromContext(const std::string &code,
                                              int cursorPosition) {
  // Look backwards from cursor for variable declaration
  std::regex varDecl(R"((\w+)\s+(\w+)\s*[=;])");
  std::sregex_iterator it(code.begin(), code.begin() + cursorPosition, varDecl);

  if (it != std::sregex_iterator()) {
    auto match = *it;
    if (match.size() >= 2) {
      return match[1].str(); // Return the type
    }
  }

  return "";
}

bool Tokenizer::isKeyword(const std::string &word) const {
  return keywords.count(word) > 0;
}

bool Tokenizer::isIdentifierStart(char c) const {
  return std::isalpha(c) || c == '_';
}

bool Tokenizer::isIdentifierPart(char c) const {
  return std::isalnum(c) || c == '_';
}

bool Tokenizer::isOperator(char c) const {
  return c == '+' || c == '-' || c == '*' || c == '/' || c == '=' || c == '<' ||
         c == '>' || c == '!' || c == '&' || c == '|' || c == '^' || c == '%' ||
         c == '.' || c == ':';
}

} // namespace codeflow
