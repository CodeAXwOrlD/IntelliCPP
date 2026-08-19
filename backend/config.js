/**
 * IntelliCPP Backend Configuration
 * Centralized, validated environment configuration with sensible defaults.
 */

const path = require('path');

const config = {
  // Server Port & Environment
  PORT: parseInt(process.env.PORT, 10) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Workspace Directory
  WORKSPACE_ROOT: process.env.WORKSPACE_ROOT
    ? path.resolve(process.env.WORKSPACE_ROOT)
    : path.resolve(__dirname, '..'),

  // CORS Allowed Origins
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ],

  // Payload Limits
  BODY_PAYLOAD_LIMIT: '512kb',
  MAX_CODE_LENGTH_BYTES: (parseInt(process.env.MAX_CODE_LENGTH_KB, 10) || 50) * 1024, // 50KB default

  // Execution & Compilation Timeouts
  EXECUTION_TIMEOUT_MS: parseInt(process.env.EXECUTION_TIMEOUT_MS, 10) || 5000,
  EXECUTION_HARD_KILL_TIMEOUT_MS: parseInt(process.env.EXECUTION_HARD_KILL_TIMEOUT_MS, 10) || 6500,
  COMPILE_TIMEOUT_MS: parseInt(process.env.COMPILE_TIMEOUT_MS, 10) || 15000,
  MAX_EXEC_BUFFER_BYTES: 512 * 1024, // 512KB max stdout/stderr buffer

  // Host Execution Resource Limits (ulimits)
  ULIMITS: {
    VIRTUAL_MEM_KB: parseInt(process.env.ULIMIT_VIRTUAL_MEM_KB, 10) || 262144, // 256MB
    MAX_FILE_SIZE_BLOCKS: parseInt(process.env.ULIMIT_FILE_BLOCKS, 10) || 10240, // 10MB
    MAX_CPU_TIME_SEC: parseInt(process.env.ULIMIT_CPU_TIME_SEC, 10) || 10,
    DISABLE_CORE_DUMP: 0,
    MAX_PIDS: parseInt(process.env.ULIMIT_MAX_PIDS, 10) || 64
  },

  // Docker Sandboxing Settings
  USE_DOCKER_SANDBOX: process.env.USE_DOCKER_SANDBOX === 'true',
  DOCKER_SANDBOX_IMAGE: process.env.DOCKER_SANDBOX_IMAGE || 'ubuntu:22.04',
  DOCKER_FLAGS: {
    NETWORK: 'none',
    MEMORY: '128m',
    CPUS: '0.5',
    PIDS_LIMIT: 64,
    READ_ONLY: true,
    USER: '1000:1000'
  },

  // Rate Limiting Settings
  RATE_LIMITS: {
    RUN_CODE: {
      BURST_CAPACITY: parseInt(process.env.TOKEN_BUCKET_RUN_CAPACITY, 10) || 5,
      REFILL_PER_SEC: parseFloat(process.env.TOKEN_BUCKET_RUN_REFILL_PER_SEC) || 0.166,
      MAX_CONCURRENT_PER_IP: parseInt(process.env.MAX_CONCURRENT_RUNS_PER_IP, 10) || 2
    },
    SUGGESTIONS: {
      WINDOW_MS: 60 * 1000,
      MAX_PER_WINDOW: parseInt(process.env.RATE_LIMIT_SUGGESTIONS_PER_MIN, 10) || 120
    },
    GLOBAL_API: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX_PER_WINDOW: 400
    }
  },

  // Toolchain Binaries (Customizable via ENV)
  TOOLCHAINS: {
    CXX: process.env.CXX_BIN || 'g++',
    PYTHON: process.env.PYTHON_BIN || 'python3',
    RUSTC: process.env.RUSTC_BIN || 'rustc'
  }
};

module.exports = config;
