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
   * Wrap result in JSON format
   */
  std::string wrapJson(bool success, const std::string& output, const std::string& error);
  
  /**
   * Escape string for JSON
   */
  std::string escapeJsonString(const std::string& str);
  
  /**
   * Legacy method for backwards compatibility
   */
  std::string escapeJson(const std::string& str);
};

#endif // CODE_RUNNER_H
