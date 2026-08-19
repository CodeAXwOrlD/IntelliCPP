/**
 * IntelliCPP Backend Server v2.0
 * Pure Node.js + Express — Config & Data-Driven Architecture
 *
 * Scalability & Concurrency Features:
 * - Decoupled Asynchronous Job Queue & Worker Pool for code execution
 * - In-Memory LRU Caching for Autocomplete Suggestions and AST/Code Stats
 * - Compression middleware for bandwidth optimization
 * - Stateless Token Bucket & Rate Limiting architecture
 * - Kubernetes Readiness & Liveness Probes (/ready, /live, /health)
 * - Optimized Static Asset Caching for frontend/build
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const config = require('./config');
const {
  STL_DB,
  containerTries,
  ALL_HEADERS,
  ALL_STL_TYPES,
  TEMPLATE_ARGS,
  HEADER_TO_CONTAINERS,
  TYPE_TO_KEY
} = require('./data');
const { getSupportedLanguageKeys } = require('./languages/registry');
const { TokenBucketLimiter } = require('./src/security/rateLimiter');
const { LRUCache } = require('./src/cache/lruCache');
const { defaultQueue } = require('./src/queue/jobQueue');
const { performReadinessCheck } = require('./src/probes/readiness');

const app = express();
app.set('trust proxy', 1);

// ─────────────────────────────────────────────
// COMPRESSION & SECURITY HEADERS
// ─────────────────────────────────────────────
app.use(compression());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", ...config.ALLOWED_ORIGINS],
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser / server-to-server / curl requests with no origin
    if (!origin) return callback(null, true);
    if (config.ALLOWED_ORIGINS.includes(origin) || config.ALLOWED_ORIGINS.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Execution-Mode']
}));

// Body payload size cap
app.use(express.json({ limit: config.BODY_PAYLOAD_LIMIT }));

// Global fallback rate limiter
const globalApiLimiter = rateLimit({
  windowMs: config.RATE_LIMITS.GLOBAL_API.WINDOW_MS,
  max: config.RATE_LIMITS.GLOBAL_API.MAX_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many requests from this IP. Please try again later.' }
});
app.use('/api/', globalApiLimiter);

// Autocomplete / Suggestions rate limiter
const suggestionsLimiter = rateLimit({
  windowMs: config.RATE_LIMITS.SUGGESTIONS.WINDOW_MS,
  max: config.RATE_LIMITS.SUGGESTIONS.MAX_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Autocomplete rate limit exceeded. Please slow down.' }
});

// Advanced Token Bucket & Concurrency Limiter for Code Execution
const runCodeLimiter = new TokenBucketLimiter({
  capacity: config.RATE_LIMITS.RUN_CODE.BURST_CAPACITY,
  refillRatePerSec: config.RATE_LIMITS.RUN_CODE.REFILL_PER_SEC,
  maxConcurrentPerIp: config.RATE_LIMITS.RUN_CODE.MAX_CONCURRENT_PER_IP,
  message: 'Code execution rate limit exceeded. Please wait a moment before running code again.'
});

// In-Memory LRU Caches
const suggestionsCache = new LRUCache({ capacity: 2000, ttlMs: 5 * 60 * 1000 });
const statsCache = new LRUCache({ capacity: 1000, ttlMs: 5 * 60 * 1000 });

// Request timing
app.use((req, res, next) => {
  req._startTime = Date.now();
  next();
});

/**
 * Safely verify if a target path is strictly contained within baseDir
 */
function isPathSafe(baseDir, targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return false;

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, targetPath);
  const relative = path.relative(resolvedBase, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }

  try {
    if (fs.existsSync(resolvedTarget)) {
      const realBase = fs.realpathSync(resolvedBase);
      const realTarget = fs.realpathSync(resolvedTarget);
      const realRelative = path.relative(realBase, realTarget);
      if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
        return false;
      }
    }
  } catch (_) {
    return false;
  }

  return true;
}

/**
 * Privacy-preserving audit logging for code executions
 */
function logExecutionAudit(req, { language, codeLength, success, exitCode, durationMs, errorCategory }) {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.connection?.remoteAddress || '127.0.0.1');
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: clientIp,
    language,
    codeLength,
    success,
    exitCode: exitCode ?? (success ? 0 : 1),
    durationMs,
    errorCategory: errorCategory || (success ? 'none' : 'runtime_or_compilation_error')
  };
  console.log(`[AUDIT] RunCode: ${JSON.stringify(logEntry)}`);
}

// ─────────────────────────────────────────────
// CORE PARSING FUNCTIONS
// ─────────────────────────────────────────────

/** Parse all #include <...> from code, return array of header names */
function parseIncludes(code) {
  const includes = [];
  const regex = /#\s*include\s*[<"]\s*([a-zA-Z0-9_/\.]+)\s*[>"]/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    const raw = m[1].replace(/\.h(pp)?$/, '').trim();
    if (raw.includes('stdc++') || raw.includes('bits')) {
      includes.push('__all__');
    } else {
      includes.push(raw);
    }
  }
  return includes;
}

/** Given included headers, return array of allowed container keys */
function getAllowedContainers(includes) {
  if (includes.includes('__all__')) {
    return Object.keys(STL_DB);
  }
  const allowed = new Set();
  for (const h of includes) {
    const containers = HEADER_TO_CONTAINERS[h] || [];
    for (const c of containers) allowed.add(c);
  }
  return [...allowed];
}

function parseAllVariables(code) {
  const symbolTable = {};
  if (!code) return symbolTable;

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    const normalized = trimmed.replace(/std::/g, '');
    const declPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[;=({]/g;

    let match;
    while ((match = declPattern.exec(normalized)) !== null) {
      const typeName = match[1].trim();
      const varName = match[2].trim();
      const skipWords = new Set([
        'if','else','for','while','do','switch','case','return','break',
        'continue','const','static','auto','int','double','float','char',
        'bool','void','long','short','unsigned','signed','new','delete',
        'class','struct','namespace','using','template','typename',
        'public','private','protected','inline','extern','cout','cin',
        'cerr','endl','main','std','nullptr','true','false'
      ]);
      if (!skipWords.has(typeName) && !skipWords.has(varName) && TYPE_TO_KEY[typeName]) {
        symbolTable[varName] = TYPE_TO_KEY[typeName];
      }
    }
  }

  return symbolTable;
}

/**
 * Infer variable type from code.
 */
function inferVariableType(varName, code) {
  if (!varName || !code) return null;
  const lines = code.split('\n');

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

    const commentIdx = line.indexOf('//');
    if (commentIdx !== -1) line = line.slice(0, commentIdx);

    const normalized = line.replace(/std::/g, '');

    const patterns = [
      new RegExp(`(?:const\\s+|static\\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\\s*<[^>]*>\\s+[*&]*${varName}\\b`),
      new RegExp(`(?:const\\s+|static\\s+)*([a-zA-Z_][a-zA-Z0-9_]*)\\s+[*&]*${varName}\\s*[;=({]`),
      new RegExp(`auto\\s+${varName}\\s*=\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*<[^>]*>`),
      new RegExp(`auto\\s+${varName}\\s*=\\s*make_unique<([a-zA-Z_][a-zA-Z0-9_]*)`),
      new RegExp(`auto\\s+${varName}\\s*=\\s*make_shared<([a-zA-Z_][a-zA-Z0-9_]*)`),
    ];

    const skipWords = new Set([
      'if','else','for','while','do','return','auto','const','static',
      'int','double','float','char','bool','void','long','short',
      'unsigned','signed','using','namespace','template','typename'
    ]);

    for (const re of patterns) {
      const match = re.exec(normalized);
      if (match) {
        const baseType = match[1].trim();
        if (!skipWords.has(baseType) && TYPE_TO_KEY[baseType]) {
          return TYPE_TO_KEY[baseType];
        }
      }
    }
  }
  return null;
}

/**
 * Extract simple declared variable names from code
 */
function extractVariableNames(code) {
  const names = new Set();
  const lines = code.split('\n').slice(0, 200);

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    const commentIndex = line.indexOf('//');
    if (commentIndex !== -1) {
      line = line.slice(0, commentIndex);
    }

    const declRegex = /^\s*(?:const\s+|static\s+|unsigned\s+|signed\s+|long\s+|short\s+|volatile\s+|mutable\s+|register\s+|constexpr\s+|inline\s+|extern\s+)*(?:std::)?[a-zA-Z_][a-zA-Z0-9_]*(?:\s*<[^>]+>)?(?:\s*::\s*[a-zA-Z_][a-zA-Z0-9_]*)*\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/;
    const autoRegex = /^\s*(?:const\s+)?auto\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/;

    const declMatch = line.match(declRegex);
    if (declMatch) {
      names.add(declMatch[1]);
      continue;
    }
    const autoMatch = line.match(autoRegex);
    if (autoMatch) {
      names.add(autoMatch[1]);
    }
  }
  return Array.from(names).filter(n => n && !['main', 'include', 'define', 'if', 'return'].includes(n));
}

// ─────────────────────────────────────────────
// PROBES & HEALTH ENDPOINTS
// ─────────────────────────────────────────────

/**
 * GET /live
 * Kubernetes Liveness Probe
 */
app.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ready
 * Kubernetes Readiness Probe
 */
app.get('/ready', (req, res) => {
  const report = performReadinessCheck();
  const statusCode = report.status === 'ready' ? 200 : 503;
  res.status(statusCode).json(report);
});

/**
 * GET /health and GET /api/health
 */
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    containers: Object.keys(STL_DB).length,
    totalMethods: Object.values(STL_DB).reduce((s, c) => s + (c.methods?.length || 0), 0),
    cache: {
      suggestions: suggestionsCache.getStats(),
      stats: statsCache.getStats()
    },
    queue: defaultQueue.getMetrics(),
    memoryUsageMB: {
      rss: (process.memoryUsage().rss / (1024 * 1024)).toFixed(1),
      heapUsed: (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1)
    }
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ─────────────────────────────────────────────
// AUTOCOMPLETE & STATS WITH LRU CACHING
// ─────────────────────────────────────────────

/**
 * POST /api/getSuggestions
 * Body: { prefix, contextType, code, cursorPosition }
 */
app.post('/api/getSuggestions', suggestionsLimiter, (req, res) => {
  try {
    const { prefix = '', contextType = 'global', code = '', language = 'cpp' } = req.body;

    const includes = parseIncludes(code);
    const sortedIncludesKey = includes.slice().sort().join(',');
    const variableMap = parseAllVariables(code);

    let resolvedType = contextType;

    if (contextType !== 'global' && contextType !== 'include_header' && contextType !== 'template_arg') {
      if (variableMap[contextType]) {
        resolvedType = variableMap[contextType];
      } else if (TYPE_TO_KEY[contextType]) {
        resolvedType = TYPE_TO_KEY[contextType];
      } else {
        const inferred = inferVariableType(contextType, code);
        if (inferred) {
          resolvedType = inferred;
        } else {
          res.set('X-Cache', 'BYPASS');
          return res.json([]);
        }
      }
    }

    // Cache lookup key
    const cacheKey = `sug:${language}:${sortedIncludesKey}:${resolvedType}:${prefix.toLowerCase()}`;
    const cached = suggestionsCache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const allowedContainers = getAllowedContainers(includes);

    // ── CASE 0: User is typing inside #include <...>
    if (contextType === 'include_header') {
      const matches = ALL_HEADERS.filter(h => !prefix || h.startsWith(prefix.toLowerCase()));
      const results = matches.map(h => ({
        text: h,
        display: `<${h}>`,
        type: 'header',
        doc: `Standard C++ header <${h}>`,
        sig: `#include <${h}>`,
        complexity: '-',
        score: prefix && h.startsWith(prefix) ? 100 : 50,
      })).slice(0, 20);

      suggestionsCache.set(cacheKey, results);
      res.set('X-Cache', 'MISS');
      return res.json(results);
    }

    // ── CASE 1: Member access (v. or str.)
    if (resolvedType !== 'global' && resolvedType !== 'template_arg') {
      if (!allowedContainers.includes(resolvedType)) {
        res.set('X-Cache', 'BYPASS');
        return res.json([]);
      }

      const trie = containerTries[resolvedType];
      if (!trie) {
        res.set('X-Cache', 'BYPASS');
        return res.json([]);
      }

      const methods = trie.search(prefix);
      const containerInfo = STL_DB[resolvedType];

      const scored = methods.map(m => {
        let score = 50;
        const name = m.name.toLowerCase();
        const p = prefix.toLowerCase();
        if (name === p) score = 100;
        else if (name.startsWith(p)) score = 80;
        else if (name.includes(p)) score = 60;
        return {
          text: m.name,
          display: `${m.name}()`,
          type: 'method',
          doc: m.doc,
          sig: m.sig,
          complexity: m.complexity,
          container: resolvedType,
          header: containerInfo?.header || resolvedType,
          score,
        };
      });

      scored.sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
      const results = scored.slice(0, 20);

      suggestionsCache.set(cacheKey, results);
      res.set('X-Cache', 'MISS');
      return res.json(results);
    }

    // ── CASE 2: Template argument (vector<|>)
    if (contextType === 'template_arg') {
      const p = prefix.toLowerCase();
      const matches = TEMPLATE_ARGS.filter(t => !p || t.text.toLowerCase().startsWith(p)).slice(0, 15);
      suggestionsCache.set(cacheKey, matches);
      res.set('X-Cache', 'MISS');
      return res.json(matches);
    }

    // ── CASE 3: Global scope (standalone words)
    const results = [];
    const p = prefix.toLowerCase();

    // 3a. Add allowed STL types whose header is included
    for (const t of ALL_STL_TYPES) {
      if (p && !t.text.toLowerCase().startsWith(p)) continue;
      const neededContainer = TYPE_TO_KEY[t.text] || t.text;
      if (allowedContainers.includes(neededContainer) || includes.includes('__all__')) {
        results.push({
          text: t.text,
          display: t.sig || t.text,
          type: t.type || 'class',
          doc: t.doc,
          sig: t.sig,
          complexity: '-',
          score: p && t.text.toLowerCase() === p ? 95 : 75,
        });
      }
    }

    // 3b. Add algorithm functions if <algorithm> is included
    if (allowedContainers.includes('algorithm')) {
      const algoTrie = containerTries['algorithm'];
      if (algoTrie) {
        const algos = algoTrie.search(prefix);
        for (const a of algos.slice(0, 10)) {
          results.push({
            text: a.name,
            display: `std::${a.name}()`,
            type: 'function',
            doc: a.doc,
            sig: a.sig,
            complexity: a.complexity,
            container: 'algorithm',
            header: 'algorithm',
            score: p && a.name.toLowerCase() === p ? 90 : 70,
          });
        }
      }
    }

    // 3c. Add locally declared variables
    const localVars = extractVariableNames(code);
    for (const v of localVars) {
      if (p && !v.toLowerCase().startsWith(p)) continue;
      results.unshift({
        text: v,
        display: v,
        type: 'variable',
        doc: `Local variable: ${v}`,
        sig: v,
        complexity: '-',
        score: 99,
      });
    }

    results.sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
    const finalResults = results.slice(0, 20);

    suggestionsCache.set(cacheKey, finalResults);
    res.set('X-Cache', 'MISS');
    res.json(finalResults);

  } catch (err) {
    console.error('[getSuggestions] Error:', err.message);
    res.json([]);
  }
});

/**
 * POST /api/getStats
 * Body: { code }
 * Returns: { symbolCount, includedLibraries, lines, characters }
 */
app.post('/api/getStats', suggestionsLimiter, (req, res) => {
  try {
    const { code = '' } = req.body;
    if (typeof code !== 'string') {
      return res.status(400).json({ error: 'Code must be a string' });
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const cached = statsCache.get(codeHash);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const includes = parseIncludes(code);
    const lines = code.split('\n').length;
    const identifiers = (code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || []);
    const result = {
      symbolCount: identifiers.length,
      includedLibraries: includes.filter(i => i !== '__all__'),
      lines,
      characters: code.length,
    };

    statsCache.set(codeHash, result);
    res.set('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    res.json({ symbolCount: 0, includedLibraries: [], lines: 0, characters: 0 });
  }
});

// ─────────────────────────────────────────────
// CODE EXECUTION & JOB QUEUE
// ─────────────────────────────────────────────

/**
 * Input validation middleware for code execution requests
 */
function validateRunCodeInput(req, res, next) {
  const { code, language = 'cpp' } = req.body || {};

  if (typeof code !== 'string') {
    return res.status(400).json({ success: false, output: '', error: 'Code payload must be a string' });
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return res.status(400).json({ success: false, output: '', error: 'No code provided' });
  }

  if (Buffer.byteLength(code, 'utf8') > config.MAX_CODE_LENGTH_BYTES) {
    logExecutionAudit(req, { language, codeLength: code.length, success: false, exitCode: 1, durationMs: 0, errorCategory: 'payload_too_large' });
    return res.status(400).json({
      success: false,
      output: '',
      error: `Code payload exceeds maximum size limit of 50KB (${Buffer.byteLength(code, 'utf8')} bytes)`
    });
  }

  if (code.includes('\0')) {
    logExecutionAudit(req, { language, codeLength: code.length, success: false, exitCode: 1, durationMs: 0, errorCategory: 'null_byte_detected' });
    return res.status(400).json({ success: false, output: '', error: 'Invalid code payload: binary or null characters detected' });
  }

  const supportedLangs = getSupportedLanguageKeys();
  const cleanLang = String(language).toLowerCase().trim();
  if (!supportedLangs.includes(cleanLang)) {
    logExecutionAudit(req, { language, codeLength: code.length, success: false, exitCode: 1, durationMs: 0, errorCategory: 'unsupported_language' });
    return res.status(400).json({
      success: false,
      output: '',
      error: `Unsupported language: "${language}". Allowed languages: ${supportedLangs.join(', ')}`
    });
  }

  req.cleanLanguage = cleanLang;
  next();
}

/**
 * POST /api/runCode
 * Body: { code, language }
 * Enqueues execution into JobQueue.
 * Supports async polling (?async=true) or default synchronous resolution.
 */
app.post('/api/runCode', validateRunCodeInput, runCodeLimiter.middleware(), async (req, res) => {
  const { code } = req.body;
  const cleanLang = req.cleanLanguage || 'cpp';
  const clientIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';

  // 1. Enqueue job into JobQueue
  const job = defaultQueue.enqueue({
    code,
    language: cleanLang,
    clientIp
  });

  const isAsyncMode = req.query.async === 'true' || req.headers['x-execution-mode'] === 'async';

  if (isAsyncMode) {
    return res.status(202).json({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      pollUrl: `/api/jobs/${job.id}`
    });
  }

  // 2. Default mode: await job execution synchronously
  try {
    const finishedJob = await defaultQueue.waitForJob(job.id, config.COMPILE_TIMEOUT_MS + config.EXECUTION_HARD_KILL_TIMEOUT_MS);
    const result = finishedJob.result || { success: false, output: '', error: 'Execution failed without result', exitCode: 1 };

    logExecutionAudit(req, {
      language: cleanLang,
      codeLength: code.length,
      success: result.success,
      exitCode: result.exitCode,
      durationMs: finishedJob.durationMs,
      errorCategory: result.errorCategory
    });

    res.json({
      success: result.success,
      output: result.output || '',
      error: result.error || '',
      jobId: finishedJob.id
    });
  } catch (err) {
    logExecutionAudit(req, { language: cleanLang, codeLength: code.length, success: false, exitCode: 1, durationMs: 0, errorCategory: 'queue_error' });
    res.status(500).json({ success: false, output: '', error: 'Job execution error: ' + err.message, jobId: job.id });
  }
});

/**
 * GET /api/jobs/:jobId & GET /api/runCode/:jobId
 * Poll status of an async execution job
 */
const getJobHandler = (req, res) => {
  const { jobId } = req.params;
  const job = defaultQueue.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: `Job ${jobId} not found or expired` });
  }
  res.json({
    id: job.id,
    status: job.status,
    language: job.language,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    durationMs: job.durationMs,
    result: job.result
  });
};

app.get('/api/jobs/:jobId', getJobHandler);
app.get('/api/runCode/:jobId', getJobHandler);

/**
 * GET /api/jobs
 * Returns JobQueue metrics and active worker status
 */
app.get('/api/jobs', (req, res) => {
  res.json(defaultQueue.getMetrics());
});

// ─────────────────────────────────────────────
// WORKSPACE FILE API
// ─────────────────────────────────────────────

/**
 * POST /api/listWorkspace
 */
app.post('/api/listWorkspace', (req, res) => {
  const { subpath = '' } = req.body;
  try {
    if (!isPathSafe(config.WORKSPACE_ROOT, subpath)) {
      return res.status(403).json({ error: 'Access denied: invalid path traversal' });
    }
    const fullPath = path.resolve(config.WORKSPACE_ROOT, subpath);
    if (!fs.existsSync(fullPath)) {
      return res.json({ path: subpath, entries: [] });
    }
    const entries = fs.readdirSync(fullPath, { withFileTypes: true })
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
      .map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        path: path.join(subpath, e.name).replace(/\\/g, '/'),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    res.json({ path: subpath, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/readFile
 */
app.post('/api/readFile', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    if (!isPathSafe(config.WORKSPACE_ROOT, filePath)) {
      return res.status(403).json({ error: 'Access denied: invalid path traversal' });
    }
    const full = path.resolve(config.WORKSPACE_ROOT, filePath);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'File not found' });
    const content = fs.readFileSync(full, 'utf8');
    res.json({ filePath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/writeFile
 */
app.post('/api/writeFile', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    if (!isPathSafe(config.WORKSPACE_ROOT, filePath)) {
      return res.status(403).json({ error: 'Access denied: invalid path traversal' });
    }
    const full = path.resolve(config.WORKSPACE_ROOT, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content || '', 'utf8');
    res.json({ success: true, filePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// STATIC ASSET SERVING WITH CACHE-CONTROL
// ─────────────────────────────────────────────
const frontendBuildPath = path.resolve(__dirname, '../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
  // Hashed immutable assets (e.g. /static/js/main.2003c52f.js)
  app.use('/static', express.static(path.join(frontendBuildPath, 'static'), {
    maxAge: '1y',
    immutable: true,
    index: false
  }));

  // Other static assets (favicon, manifest, etc.)
  app.use(express.static(frontendBuildPath, {
    maxAge: '1d',
    index: 'index.html',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/ready') || req.path.startsWith('/live')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: `${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(config.PORT, () => {
    const totalMethods = Object.values(STL_DB).reduce((s, c) => s + (c.methods?.length || 0), 0);
    console.log(`\n⚡ IntelliCPP Backend v2.0 (High-Concurrency Ready)`);
    console.log(`   Port:       ${config.PORT}`);
    console.log(`   Containers: ${Object.keys(STL_DB).length}`);
    console.log(`   Methods:    ${totalMethods}`);
    console.log(`   Languages:  ${getSupportedLanguageKeys().join(', ')}`);
    console.log(`   Workspace:  ${config.WORKSPACE_ROOT}`);
    console.log(`   Queue:      InMemory (Concurrency: ${defaultQueue.concurrency})`);
    console.log(`   Endpoints:  /ready /live /health /api/getSuggestions /api/getStats /api/runCode /api/jobs/:id\n`);
  });
}

module.exports = app;
