/**
 * Kubernetes / Container Readiness & Liveness Probes
 * Verifies system dependencies (compilers, STL database, native addon, filesystem).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { STL_DB } = require('../../data');

let nativeAddonLoaded = false;
let nativeAddonError = null;

try {
  const addonPath = path.join(__dirname, '../../build/Release/codeflow_native.node');
  if (fs.existsSync(addonPath)) {
    const native = require(addonPath);
    if (native && native.SuggestionEngine) {
      nativeAddonLoaded = true;
    }
  }
} catch (err) {
  nativeAddonError = err.message;
}

/**
 * Check if a command/binary is executable on the host
 */
function isBinaryAvailable(binaryName) {
  try {
    execSync(`which ${binaryName} 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Execute comprehensive readiness checks
 */
function performReadinessCheck() {
  const checks = {
    cxx_compiler: {
      binary: config.TOOLCHAINS.CXX,
      available: isBinaryAvailable(config.TOOLCHAINS.CXX)
    },
    python_interpreter: {
      binary: config.TOOLCHAINS.PYTHON,
      available: isBinaryAvailable(config.TOOLCHAINS.PYTHON)
    },
    rust_compiler: {
      binary: config.TOOLCHAINS.RUSTC,
      available: isBinaryAvailable(config.TOOLCHAINS.RUSTC)
    },
    stl_database: {
      loaded: Object.keys(STL_DB).length > 0,
      containersCount: Object.keys(STL_DB).length
    },
    native_cpp_addon: {
      loaded: nativeAddonLoaded,
      error: nativeAddonError
    },
    workspace_directory: {
      path: config.WORKSPACE_ROOT,
      accessible: fs.existsSync(config.WORKSPACE_ROOT)
    }
  };

  // Critical requirements: at least C++ compiler and STL database must be healthy
  const isHealthy =
    checks.cxx_compiler.available &&
    checks.stl_database.loaded &&
    checks.workspace_directory.accessible;

  return {
    status: isHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks
  };
}

module.exports = {
  performReadinessCheck
};
