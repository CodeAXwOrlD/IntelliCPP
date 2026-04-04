import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Save, Upload } from 'lucide-react';

export default function FileExplorer({
  files,
  currentFile,
  workspaceTree = [],
  onFileSelect,
  onNewFile,
  onSaveFile,
  onOpenFile,
  onWorkspaceFileClick,
  onRefreshWorkspace
}) {
  const [expandedFolders, setExpandedFolders] = useState(new Set(['workspace']));
  const [selectedFile, setSelectedFile] = useState(currentFile || (files && files.length > 0 ? files[0].name : ''));

  useEffect(() => {
    setSelectedFile(currentFile || '');
  }, [currentFile]);

  const toggleFolder = (folderName) => {
    const next = new Set(expandedFolders);
    if (next.has(folderName)) {
      next.delete(folderName);
    } else {
      next.add(folderName);
    }
    setExpandedFolders(next);
  };

  const handleFileClick = (entry) => {
    setSelectedFile(entry.path);
    if (onWorkspaceFileClick) {
      onWorkspaceFileClick(entry.path);
      return;
    }
    if (onFileSelect) {
      onFileSelect(entry);
    }
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>EXPLORER</h3>
        <div className="file-explorer-actions">
          <button onClick={onNewFile} title="New File">
            <Plus size={16} />
          </button>
          <button onClick={onOpenFile} title="Open Workspace">
            <Upload size={16} />
          </button>
          <button onClick={onSaveFile} title="Save Current File">
            <Save size={16} />
          </button>
        </div>
      </div>

      <div className="file-tree">
        <div className="file-tree-item folder-item">
          <div className="file-tree-toggle" onClick={() => toggleFolder('workspace')}>
            {expandedFolders.has('workspace') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {expandedFolders.has('workspace') ? <FolderOpen size={16} /> : <Folder size={16} />}
            <span>Workspace</span>
            <button
              style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#8b93a8', cursor: 'pointer' }}
              onClick={onRefreshWorkspace}
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {expandedFolders.has('workspace') && (
            <div className="file-tree-children">
              {workspaceTree.length > 0 ? (
                workspaceTree.map((entry) => (
                  <div
                    key={entry.path}
                    className={`file-tree-item file-item ${selectedFile === entry.path ? 'selected' : ''}`}
                    onClick={() => entry.isDirectory ? toggleFolder(entry.path) : handleFileClick(entry)}
                  >
                    {entry.isDirectory ? <Folder size={16} /> : <File size={16} />}
                    <span>{entry.name}</span>
                  </div>
                ))
              ) : (
                <div className="file-tree-item">No workspace files loaded</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}