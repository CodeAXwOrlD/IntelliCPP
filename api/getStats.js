/**
 * Vercel Serverless Function for Stats
 * Provides code statistics and information
 */

const path = require('path');
const fs = require('fs');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    // Basic code statistics
    const stats = {
      symbolCount: 0,
      includedLibraries: [],
      lines: 0,
      characters: 0
    };

    if (code && typeof code === 'string') {
      // Count lines
      stats.lines = code.split('\n').length;
      stats.characters = code.length;

      // Count symbols (basic implementation)
      const symbols = code.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      stats.symbolCount = symbols.length;

      // Extract included libraries
      const includes = code.match(/#include\s*[<"][^>"]+[>"]/g) || [];
      stats.includedLibraries = includes.map(inc => 
        inc.replace(/#include\s*[<"]/, '').replace(/[>"]/, '').trim()
      );
    }

    res.status(200).json({
      success: true,
      ...stats
    });

  } catch (error) {
    console.error('[Stats API] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      symbolCount: 0,
      includedLibraries: []
    });
  }
}
