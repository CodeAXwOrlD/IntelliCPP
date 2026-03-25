import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Search } from 'lucide-react';

export default function FileExplorer({ onFileSelect, currentFile }) {
  const [files, setFiles] = useState([
    {
      name: 'main.cpp',
      type: 'file',
      content: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> v;

    return 0;
}`
    },
    {
      name: 'utils.cpp',
      type: 'file',
      content: `#include <iostream>
#include <string>

// Utility functions
std::string greet(std::string name) {
    return "Hello, " + name + "!";
}`
    },
    {
      name: 'utils.h',
      type: 'file',
      content: `#ifndef UTILS_H
#define UTILS_H

#include <string>

std::string greet(std::string name);

#endif`
    }
  ]);

  const [expandedFolders, setExpandedFolders] = useState(new Set(['src']));
  const [selectedFile, setSelectedFile] = useState(currentFile || 'main.cpp');

  const toggleFolder = (folderName) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = (fileName) => {
    setSelectedFile(fileName);
    const file = files.find(f => f.name === fileName);
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  const addNewFile = () => {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      const newFile = {
        name: fileName,
        type: 'file',
        content: '// New file\n'
      };
      setFiles([...files, newFile]);
    }
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>EXPLORER</h3>
        <div className="file-explorer-actions">
          <button onClick={addNewFile} title="New File">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="file-tree">
        <div className="file-tree-item folder-item">
          <div
            className="file-tree-toggle"
            onClick={() => toggleFolder('src')}
          >
            {expandedFolders.has('src') ?
              <ChevronDown size={16} /> :
              <ChevronRight size={16} />
            }
            {expandedFolders.has('src') ?
              <FolderOpen size={16} /> :
              <Folder size={16} />
            }
            <span>src</span>
          </div>

          {expandedFolders.has('src') && (
            <div className="file-tree-children">
              {files.map((file) => (
                <div
                  key={file.name}
                  className={`file-tree-item file-item ${selectedFile === file.name ? 'selected' : ''}`}
                  onClick={() => handleFileClick(file.name)}
                >
                  <File size={16} />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}