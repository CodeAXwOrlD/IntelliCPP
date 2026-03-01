#include "suggestion_engine.h"
#include <iostream>
#include <string>

using namespace codeflow;

int main() {
    SuggestionEngine engine;
    
    // Load data
    engine.loadKeywords("data/cpp_keywords.txt");
    engine.loadSTLData("data/stl_functions.json");
    
    // Test code with vector declaration
    std::string code = R"(
#include <vector>

using namespace std;

int main() {
    vector<int> v;
    
    return 0;
}
)";
    
    // Update symbols
    engine.updateSymbols(code);
    
    // Check symbol table
    auto symbols = engine.getSymbolTable();
    std::cout << "Symbol Table:\n";
    for (const auto& pair : symbols) {
        std::cout << "  " << pair.first << " -> " << pair.second << "\n";
    }
    
    // Check included libraries
    auto libs = engine.getIncludedLibraries();
    std::cout << "\nIncluded Libraries:\n";
    for (const auto& lib : libs) {
        std::cout << "  " << lib << "\n";
    }
    
    // Test suggestions for "v."
    std::cout << "\nSuggestions for 'v.':\n";
    auto suggestions = engine.getSuggestions("", "v", code, code.find("v.") + 2, 10);
    for (const auto& s : suggestions) {
        std::cout << "  " << s.text << " (" << s.type << ")\n";
    }
    
    // Test suggestions for "s."
    std::cout << "\nSuggestions for 's.':\n";
    auto suggestions2 = engine.getSuggestions("", "s", code, code.find("s.") + 2, 10);
    for (const auto& s : suggestions2) {
        std::cout << "  " << s.text << " (" << s.type << ")\n";
    }
    
    return 0;
}
