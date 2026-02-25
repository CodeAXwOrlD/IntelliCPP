#include "code_runner.h"
#include <fstream>
#include <sstream>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <array>
#include <chrono>

CodeRunner::CodeRunner() {}

std::string CodeRunner::wrapJson(bool success, const std::string& output, const std::string& error) {
  std::string result = "{\"success\":" + std::string(success ? "true" : "false") + 
                      ",\"output\":" + escapeJsonString(output) + 
                      ",\"error\":" + escapeJsonString(error) + "}";
  return result;
}

std::string CodeRunner::escapeJsonString(const std::string& str) {
  std::string result = "\"";
  for (char c : str) {
    switch (c) {
      case '\\': result += "\\\\"; break;
      case '"': result += "\\\""; break;
      case '\n': result += "\\n"; break;
      case '\r': result += "\\r"; break;
      case '\t': result += "\\t"; break;
      case '\b': result += "\\b"; break;
      case '\f': result += "\\f"; break;
      default:
        if (c < 32) {
          char buf[7];
          snprintf(buf, sizeof(buf), "\\u%04x", (unsigned char)c);
          result += buf;
        } else {
          result += c;
        }
    }
  }
  result += "\"";
  return result;
}

std::string CodeRunner::runCode(const std::string& cppCode) {
  // Create temporary directory if it doesn't exist
  system("mkdir -p /tmp/codeflow");

  // Write code to temporary file
  std::string tempFile = "/tmp/codeflow/main.cpp";
  std::ofstream outfile(tempFile);
  if (!outfile.is_open()) {
    return wrapJson(false, "", "Failed to create temporary file");
  }
  outfile << cppCode;
  outfile.close();

  // Try to compile with g++
  std::string compileCmd = "g++ -std=c++20 /tmp/codeflow/main.cpp -o /tmp/codeflow/program 2>&1";
  FILE* compileStream = popen(compileCmd.c_str(), "r");
  if (!compileStream) {
    return wrapJson(false, "", "Failed to execute compiler");
  }

  std::string compileOutput;
  char buffer[256];
  while (fgets(buffer, sizeof(buffer), compileStream) != nullptr) {
    compileOutput += buffer;
  }
  int compileStatus = pclose(compileStream);

  // If compilation failed, return error
  if (compileStatus != 0) {
    return wrapJson(false, "", compileOutput);
  }

  // Run the compiled program with timeout
  std::string runCmd = "timeout 5 /tmp/codeflow/program 2>&1";
  FILE* runStream = popen(runCmd.c_str(), "r");
  if (!runStream) {
    return wrapJson(false, "", "Failed to execute program");
  }

  std::string output;
  while (fgets(buffer, sizeof(buffer), runStream) != nullptr) {
    output += buffer;
  }
  int runStatus = pclose(runStream);

  // Check if program timed out
  if (runStatus == 124) {
    return wrapJson(false, "", "Program execution timeout");
  }

  // Return result
  if (runStatus == 0) {
    return wrapJson(true, output, "");
  } else {
    std::string error = "Program exited with code " + std::to_string(runStatus);
    return wrapJson(false, output, error);
  }
}

std::string CodeRunner::escapeJson(const std::string& str) {
  // Deprecated - use escapeJsonString instead
  return escapeJsonString(str);
}
