import React, { useEffect, useRef } from 'react';
import '../styles/glassmorphism.css';

export default function SuggestionPopup({ suggestions, selectedIndex, onSelect }) {
  const selectedItemRef = useRef(null);

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  return (
    <div className="suggestion-popup">
      <ul className="suggestion-list">
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion.text}-${index}`}
            ref={index === selectedIndex ? selectedItemRef : null}
            className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => {}}
            role="option"
            aria-selected={index === selectedIndex}
          >
            <span className="suggestion-text">{suggestion.text}</span>
            <span className="suggestion-type">{suggestion.type}</span>
            <span className="suggestion-score">
              {(suggestion.score * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
