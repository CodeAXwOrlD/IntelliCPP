/**
 * IntelliCPP Backend Language Registry
 * Defines toolchain execution rules, compilers, interpreters, and sandbox commands.
 *
 * NOTE: Language keys here MUST match frontend/src/languages/registry.js ('cpp', 'python', 'rust').
 */

const config = require('../config');

const LANGUAGE_REGISTRY = {
  cpp: {
    id: 'cpp',
    name: 'C++20',
    extension: '.cpp',
    filename: 'main.cpp',
    outputFilename: 'program',
    isCompiled: true,
    compileCmd: (srcFile, binFile) => `${config.TOOLCHAINS.CXX} -std=c++20 -O2 -o "${binFile}" "${srcFile}" 2>&1`,
    runCmd: (binFile) => `"${binFile}"`,
    dockerRunCmd: './program',
    compileTimeoutMs: config.COMPILE_TIMEOUT_MS,
    executionTimeoutMs: config.EXECUTION_TIMEOUT_MS
  },

  python: {
    id: 'python',
    name: 'Python 3.12',
    extension: '.py',
    filename: 'script.py',
    outputFilename: null,
    isCompiled: false,
    compileCmd: null,
    runCmd: (srcFile) => `${config.TOOLCHAINS.PYTHON} "${srcFile}"`,
    dockerRunCmd: 'python3 script.py',
    compileTimeoutMs: 0,
    executionTimeoutMs: config.EXECUTION_TIMEOUT_MS
  },

  rust: {
    id: 'rust',
    name: 'Rust',
    extension: '.rs',
    filename: 'main.rs',
    outputFilename: 'program',
    isCompiled: true,
    compileCmd: (srcFile, binFile) => `${config.TOOLCHAINS.RUSTC} -O -o "${binFile}" "${srcFile}" 2>&1`,
    runCmd: (binFile) => `"${binFile}"`,
    dockerRunCmd: './program',
    compileTimeoutMs: config.COMPILE_TIMEOUT_MS,
    executionTimeoutMs: config.EXECUTION_TIMEOUT_MS
  }
};

/**
 * Get language configuration by ID
 */
function getLanguage(langId) {
  if (!langId) return null;
  const key = String(langId).toLowerCase().trim();
  return LANGUAGE_REGISTRY[key] || null;
}

/**
 * Returns array of supported language keys: ['cpp', 'python', 'rust']
 */
function getSupportedLanguageKeys() {
  return Object.keys(LANGUAGE_REGISTRY);
}

module.exports = {
  LANGUAGE_REGISTRY,
  getLanguage,
  getSupportedLanguageKeys
};
