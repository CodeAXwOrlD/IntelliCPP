#ifndef CODE_RUNNER_H
#define CODE_RUNNER_H

#include <string>

class CodeRunner {
public:
  CodeRunner();
  
  /**
   * Compile and run C++ code
   * @param cppCode Source code to compile and run
   * @return JSON string with result: {"success":bool, "output":string, "error":string}
   */
  std::string runCode(const std::string& cppCode);

private:
  /**
   * Escape special characters for JSON
   */
  std::string escapeJson(const std::string& str);
};

#endif // CODE_RUNNER_H
