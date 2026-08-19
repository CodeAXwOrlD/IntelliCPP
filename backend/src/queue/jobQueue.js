/**
 * IntelliCPP Job Queue & Worker Pool
 * Decouples CPU-heavy code compilation/execution from Express HTTP request handling.
 *
 * Provides in-memory worker queue by default with structured interfaces
 * for dropping in BullMQ + Redis for distributed multi-node worker clusters.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const EventEmitter = require('events');

const config = require('../../config');
const { getLanguage } = require('../../languages/registry');

class InMemoryJobQueue extends EventEmitter {
  /**
   * @param {Object} options
   * @param {number} [options.concurrency=4] - Maximum concurrent execution workers
   * @param {number} [options.maxCompletedRetention=500] - Max finished jobs kept in memory
   */
  constructor({ concurrency = 4, maxCompletedRetention = 500 } = {}) {
    super();
    this.concurrency = concurrency;
    this.maxCompletedRetention = maxCompletedRetention;

    this.queue = []; // Array of job objects
    this.jobs = new Map(); // Map: jobId => jobObject
    this.activeWorkers = 0;
    this.totalProcessed = 0;
  }

  /**
   * Enqueue a new code execution job
   */
  enqueue({ code, language = 'cpp', clientIp = '127.0.0.1' }) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const job = {
      id: jobId,
      status: 'queued', // queued | running | completed | failed | timeout
      language,
      code,
      clientIp,
      codeLength: code.length,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      durationMs: 0,
      result: null // { success, output, error, exitCode }
    };

    this.jobs.set(jobId, job);
    this.queue.push(job);
    this.emit('job:enqueued', job);

    // Trigger queue processing on next tick
    setImmediate(() => this.processNext());

    return job;
  }

  /**
   * Look up a job by ID
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Wait for a job to complete (for synchronous callers)
   */
  waitForJob(jobId, timeoutMs = 15000) {
    const job = this.getJob(jobId);
    if (!job) {
      return Promise.reject(new Error(`Job ${jobId} not found`));
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'timeout') {
      return Promise.resolve(job);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanupListeners();
        resolve(this.getJob(jobId) || job);
      }, timeoutMs);

      const onFinish = (finishedJob) => {
        if (finishedJob.id === jobId) {
          cleanupListeners();
          clearTimeout(timer);
          resolve(finishedJob);
        }
      };

      const cleanupListeners = () => {
        this.removeListener('job:completed', onFinish);
        this.removeListener('job:failed', onFinish);
      };

      this.on('job:completed', onFinish);
      this.on('job:failed', onFinish);
    });
  }

  /**
   * Worker queue loop: process next queued job if worker capacity is available
   */
  async processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeWorkers++;
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    const startTime = Date.now();
    this.emit('job:started', job);

    try {
      const result = await this.executeJobInSandbox(job);
      job.result = result;
      job.status = result.success ? 'completed' : (result.errorCategory === 'timeout' ? 'timeout' : 'failed');
      job.finishedAt = new Date().toISOString();
      job.durationMs = Date.now() - startTime;
      this.totalProcessed++;
      this.emit('job:completed', job);
    } catch (err) {
      job.result = {
        success: false,
        output: '',
        error: err.message,
        exitCode: 1
      };
      job.status = 'failed';
      job.finishedAt = new Date().toISOString();
      job.durationMs = Date.now() - startTime;
      this.totalProcessed++;
      this.emit('job:failed', job);
    } finally {
      this.activeWorkers--;
      this.pruneOldJobs();
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Execute code inside isolated temporary sandbox with ulimits or Docker
   */
  executeJobInSandbox(job) {
    return new Promise((resolve) => {
      const { code, language } = job;
      const langConfig = getLanguage(language);
      if (!langConfig) {
        return resolve({
          success: false,
          output: '',
          error: `Unsupported language: "${language}"`,
          exitCode: 1,
          errorCategory: 'unsupported_language'
        });
      }

      const tmpDir = path.join('/tmp', 'intellicpp_' + job.id);
      const cleanup = () => {
        try {
          if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          }
        } catch (_) {}
      };

      const { VIRTUAL_MEM_KB, MAX_FILE_SIZE_BLOCKS, MAX_CPU_TIME_SEC, DISABLE_CORE_DUMP, MAX_PIDS } = config.ULIMITS;
      const HOST_ULIMIT_PREFIX = `ulimit -v ${VIRTUAL_MEM_KB} -f ${MAX_FILE_SIZE_BLOCKS} -c ${DISABLE_CORE_DUMP} -t ${MAX_CPU_TIME_SEC} -u ${MAX_PIDS} 2>/dev/null; `;

      try {
        fs.mkdirSync(tmpDir, { recursive: true });

        const srcFile = path.join(tmpDir, langConfig.filename);
        const binFile = langConfig.outputFilename ? path.join(tmpDir, langConfig.outputFilename) : null;
        fs.writeFileSync(srcFile, code, 'utf8');

        // 1. Compilation
        if (langConfig.isCompiled && typeof langConfig.compileCmd === 'function') {
          try {
            const compileCmd = `${HOST_ULIMIT_PREFIX} ${langConfig.compileCmd(srcFile, binFile)}`;
            execSync(compileCmd, { timeout: langConfig.compileTimeoutMs, maxBuffer: config.MAX_EXEC_BUFFER_BYTES });
          } catch (compileErr) {
            cleanup();
            return resolve({
              success: false,
              output: '',
              error: compileErr.stdout?.toString() || compileErr.message,
              exitCode: 1,
              errorCategory: 'compilation_error'
            });
          }
        }

        // 2. Execution
        let runCommand = '';
        if (config.USE_DOCKER_SANDBOX) {
          const { NETWORK, MEMORY, CPUS, PIDS_LIMIT, USER } = config.DOCKER_FLAGS;
          runCommand = `docker run --rm --network=${NETWORK} --memory=${MEMORY} --cpus=${CPUS} --pids-limit=${PIDS_LIMIT} --read-only --user ${USER} -v "${tmpDir}:/workspace:rw" -w /workspace ${config.DOCKER_SANDBOX_IMAGE} ${langConfig.dockerRunCmd}`;
        } else {
          const targetFile = binFile || srcFile;
          const timeoutSec = Math.ceil((langConfig.executionTimeoutMs || 5000) / 1000);
          runCommand = `${HOST_ULIMIT_PREFIX} timeout -k 1 ${timeoutSec} ${langConfig.runCmd(targetFile)}`;
        }

        exec(runCommand, { timeout: config.EXECUTION_HARD_KILL_TIMEOUT_MS, maxBuffer: config.MAX_EXEC_BUFFER_BYTES }, (runErr, stdout, stderr) => {
          cleanup();
          if ((runErr && runErr.killed) || (runErr && runErr.code === 124)) {
            return resolve({
              success: false,
              output: '',
              error: 'Execution timed out (5s limit)',
              exitCode: 124,
              errorCategory: 'timeout'
            });
          }
          if (runErr && runErr.code !== 0 && !stdout) {
            return resolve({
              success: false,
              output: '',
              error: stderr || runErr.message,
              exitCode: runErr.code || 1,
              errorCategory: 'runtime_error'
            });
          }
          resolve({
            success: true,
            output: stdout || '',
            error: stderr || '',
            exitCode: 0,
            errorCategory: 'none'
          });
        });

      } catch (err) {
        cleanup();
        resolve({
          success: false,
          output: '',
          error: 'Execution failed: ' + err.message,
          exitCode: 1,
          errorCategory: 'internal_error'
        });
      }
    });
  }

  /**
   * Evict old completed/failed jobs if map exceeds retention limit
   */
  pruneOldJobs() {
    if (this.jobs.size > this.maxCompletedRetention) {
      const excess = this.jobs.size - this.maxCompletedRetention;
      let removed = 0;
      for (const [id, job] of this.jobs.entries()) {
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'timeout') {
          this.jobs.delete(id);
          removed++;
          if (removed >= excess) break;
        }
      }
    }
  }

  /**
   * Queue metrics
   */
  getMetrics() {
    let queued = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      if (job.status === 'queued') queued++;
      else if (job.status === 'running') running++;
      else if (job.status === 'completed') completed++;
      else if (job.status === 'failed' || job.status === 'timeout') failed++;
    }

    return {
      activeWorkers: this.activeWorkers,
      concurrency: this.concurrency,
      queued,
      running,
      completed,
      failed,
      totalProcessed: this.totalProcessed,
      trackedJobs: this.jobs.size
    };
  }
}

// Global default queue instance
const defaultQueue = new InMemoryJobQueue({ concurrency: 4 });

module.exports = {
  InMemoryJobQueue,
  defaultQueue
};
