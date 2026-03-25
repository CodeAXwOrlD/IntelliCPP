import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, X } from 'lucide-react';

export default function SearchPanel({ code, onResultSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [results, setResults] = useState([]);
  const [expandedResults, setExpandedResults] = useState(new Set());
  const [isReplaceMode, setIsReplaceMode] = useState(false);

  const performSearch = () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const lines = code.split('\n');
    const searchResults = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const matches = [];
      let searchIndex = 0;

      while (true) {
        const matchIndex = line.indexOf(searchQuery, searchIndex);
        if (matchIndex === -1) break;

        matches.push({
          start: matchIndex,
          end: matchIndex + searchQuery.length
        });

        searchIndex = matchIndex + 1;
      }

      if (matches.length > 0) {
        searchResults.push({
          line: lineNumber,
          content: line,
          matches: matches
        });
      }
    });

    setResults(searchResults);
  };

  const toggleResultExpansion = (lineNumber) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(lineNumber)) {
      newExpanded.delete(lineNumber);
    } else {
      newExpanded.add(lineNumber);
    }
    setExpandedResults(newExpanded);
  };

  const handleReplace = () => {
    if (!searchQuery || !replaceQuery) return;

    const newCode = code.replaceAll(searchQuery, replaceQuery);
    if (onResultSelect) {
      onResultSelect({ type: 'replace', newCode });
    }
  };

  const handleResultClick = (result) => {
    if (onResultSelect) {
      onResultSelect({ type: 'goto', line: result.line });
    }
  };

  React.useEffect(() => {
    performSearch();
  }, [searchQuery, code]);

  return (
    <div className="search-panel">
      <div className="search-header">
        <h3>SEARCH</h3>
      </div>

      <div className="search-controls">
        <div className="search-input-group">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="search-options">
          <button
            className={`search-toggle ${isReplaceMode ? 'active' : ''}`}
            onClick={() => setIsReplaceMode(!isReplaceMode)}
          >
            Replace
          </button>
        </div>

        {isReplaceMode && (
          <div className="search-input-group">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Replace"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
              />
            </div>
            <button
              className="search-replace-btn"
              onClick={handleReplace}
              disabled={!searchQuery || !replaceQuery}
            >
              Replace All
            </button>
          </div>
        )}
      </div>

      <div className="search-results">
        <div className="search-results-header">
          {results.length} results in 1 file
        </div>

        <div className="search-results-list">
          {results.map((result) => (
            <div key={result.line} className="search-result-item">
              <div
                className="search-result-header"
                onClick={() => toggleResultExpansion(result.line)}
              >
                {expandedResults.has(result.line) ?
                  <ChevronDown size={14} /> :
                  <ChevronRight size={14} />
                }
                <span className="search-result-line">{result.line}</span>
                <span className="search-result-content">{result.content}</span>
              </div>

              {expandedResults.has(result.line) && (
                <div className="search-result-details">
                  {result.matches.map((match, index) => (
                    <div
                      key={index}
                      className="search-match"
                      onClick={() => handleResultClick(result)}
                    >
                      {result.content.substring(0, match.start)}
                      <span className="search-highlight">
                        {result.content.substring(match.start, match.end)}
                      </span>
                      {result.content.substring(match.end)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}