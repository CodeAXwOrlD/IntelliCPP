#include "code_runner.h"
#include <fstream>
#include <sstream>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <array>
#include <chrono>

CodeRunner::CodeRunner() {}

std::string CodeRunner::runCode(const std::string& cppCode) {
  // Create temporary directory if it doesn't exist
  system("mkdir -p /tmp/codeflow");

  // Write code to temporary file
  std::string tempFile = "/tmp/codeflow/main.cpp";
  std::ofstream outfile(tempFile);
  if (!outfile.is_open()) {
    return R"({"success":false,"output":"","error":"Failed to create temporary file"})";
  }
  outfile << cppCode;
  outfile.close();

  // Try to compile with g++
  std::string compileCmd = "g++ -std=c++20 /tmp/codeflow/main.cpp -o /tmp/codeflow/program 2>&1";
  FILE* compileStream = popen(compileCmd.c_str(), "r");
  if (!compileStream) {
    return R"({"success":false,"output":"","error":"Failed to execute compiler"})";
  }

  std::string compileOutput;
  char buffer[256];
  while (fgets(buffer, sizeof(buffer), compileStream) != nullptr) {
    compileOutput += buffer;
  }
  int compileStatus = pclose(compileStream);

  // If compilation failed, return error
  if (compileStatus != 0) {
    // Escape quotes in error message
    std::string escapedError = escapeJson(compileOutput);
    return R"({"success":false,"output":"","error":")" + escapedError + R"("})";
  }

  // Run the compiled program with timeout
  std::string runCmd = "timeout 5 /tmp/codeflow/program 2>&1";
  FILE* runStream = popen(runCmd.c_str(), "r");
  if (!runStream) {
    return R"({"success":false,"output":"","error":"Failed to execute program"})";
  }

  std::string output;
  while (fgets(buffer, sizeof(buffer), runStream) != nullptr) {
    output += buffer;
  }
  int runStatus = pclose(runStream);

  // Check if program timed out
  if (runStatus == 124) {
    return R"({"success":false,"output":"","error":"Program execution timeout (5 seconds)"})";
  }

  // Escape quotes in output
  std::string escapedOutput = escapeJson(output);
  if (runStatus == 0) {
    return R"({"success":true,"output":")" + escapedOutput + R"(","error":""})";
  } else {
    return R"({"success":false,"output":")" + escapedOutput + R"(","error":"Program exited with code )" + 
           std::to_string(runStatus) + R"("})";
  }
}

std::string CodeRunner::escapeJson(const std::string& str) {
  std::string result;
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
  return result;
}
