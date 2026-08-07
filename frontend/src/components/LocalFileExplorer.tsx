// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Folder, 
  FolderPlus, 
  UploadCloud, 
  FileAudio, 
  Play, 
  ListPlus, 
  Search, 
  HardDrive, 
  ArrowLeft, 
  RefreshCw, 
  Music, 
  CheckCircle,
  FileText
} from 'lucide-react';
import { apiClient } from '../api/client';

interface LocalFileExplorerProps {
  onPlayTrack?: (track: { name: string; artist: string; preview_url: string; source: string }) => void;
  onAddToQueue?: (track: { name: string; artist: string; preview_url: string; source: string }) => void;
}

interface LocalTrack {
  id: string;
  name: string;
  artist: string;
  size: number;
  format: string;
  url: string;
  fileObject?: File;
  source: string;
}

export default function LocalFileExplorer({ onPlayTrack, onAddToQueue }: LocalFileExplorerProps) {
  const [explorerMode, setExplorerMode] = useState<'browser' | 'backend'>('browser');
  
  // Browser Local Files State
  const [localTracks, setLocalTracks] = useState<LocalTrack[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Backend Directory Explorer State
  const [backendPath, setBackendPath] = useState<string>('D:\\PROJECT\\Music Mirror');
  const [backendParent, setBackendParent] = useState<string | null>(null);
  const [backendItems, setBackendItems] = useState<any[]>([]);
  const [backendAudioCount, setBackendAudioCount] = useState<number>(0);
  const [availableDrives, setAvailableDrives] = useState<string[]>([]);
  const [loadingBackend, setLoadingBackend] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Fetch backend directory contents
  const fetchBackendDirectory = async (path?: string) => {
    setLoadingBackend(true);
    setBackendError(null);
    try {
      const url = path ? `/local-explorer/files?path=${encodeURIComponent(path)}` : '/local-explorer/files';
      const res = await apiClient.get(url);
      if (res.data) {
        setBackendPath(res.data.current_path);
        setBackendParent(res.data.parent_path);
        setBackendItems(res.data.items || []);
        setBackendAudioCount(res.data.audio_count || 0);
        if (res.data.available_drives) {
          setAvailableDrives(res.data.available_drives);
        }
      }
    } catch (err: any) {
      setBackendError(err?.response?.data?.detail || 'Failed to scan backend local directory');
    } finally {
      setLoadingBackend(false);
    }
  };

  useEffect(() => {
    if (explorerMode === 'backend') {
      fetchBackendDirectory(backendPath || undefined);
    }
  }, [explorerMode]);

  // Handle Drag & Drop Files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
    const newTracks: LocalTrack[] = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (audioExts.includes(ext)) {
        const objectUrl = URL.createObjectURL(file);
        newTracks.push({
          id: `${file.name}-${file.size}-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Local Track',
          size: file.size,
          format: ext.toUpperCase(),
          url: objectUrl,
          fileObject: file,
          source: 'Local File Explorer'
        });
      }
    });

    if (newTracks.length > 0) {
      setLocalTracks((prev) => [...newTracks, ...prev]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Browser File System Access API
  const handlePickDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            files.push(file);
          }
        }
        processFiles(files);
      } else {
        document.getElementById('folder-input-element')?.click();
      }
    } catch {
      // User cancelled picker
    }
  };

  const handlePlayTrack = (track: LocalTrack | any, isBackendStream: boolean = false) => {
    if (onPlayTrack) {
      let previewUrl = track.url;
      if (isBackendStream) {
        const apiBase = apiClient.defaults.baseURL || 'http://localhost:8000';
        previewUrl = `${apiBase}/local-explorer/stream?file_path=${encodeURIComponent(track.path)}`;
      }

      onPlayTrack({
        name: track.name || track.title,
        artist: track.artist || 'Local Machine',
        preview_url: previewUrl,
        source: isBackendStream ? 'Local Backend Disk' : 'Browser Local Disk'
      });
    }
  };

  const filteredLocalTracks = localTracks.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBackendItems = backendItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="panel local-explorer-panel">
      <div className="explorer-header">
        <div className="flex-between">
          <div className="brand-badge">
            <HardDrive size={20} className="icon-glow" />
            <div>
              <h3 style={{ margin: 0 }}>Local Audio File Explorer</h3>
              <small style={{ color: 'rgba(255,255,255,0.6)' }}>Scan local folders, drag & drop audio tracks, and play directly</small>
            </div>
          </div>

          <div className="mode-toggle-group">
            <button 
              className={`mode-btn ${explorerMode === 'browser' ? 'active' : ''}`}
              onClick={() => setExplorerMode('browser')}
            >
              <UploadCloud size={14} /> Drag & Drop / Browser
            </button>
            <button 
              className={`mode-btn ${explorerMode === 'backend' ? 'active' : ''}`}
              onClick={() => setExplorerMode('backend')}
            >
              <HardDrive size={14} /> Local Disk Scanner
            </button>
          </div>
        </div>
      </div>

      {/* BROWSER LOCAL DRAG & DROP MODE */}
      {explorerMode === 'browser' && (
        <div className="browser-explorer-section" style={{ marginTop: '1rem' }}>
          <div 
            className={`dropzone-card ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <UploadCloud size={40} className="upload-icon-pulse" />
            <h4>Drag & Drop Audio Files or Folders Here</h4>
            <p>Supports MP3, WAV, FLAC, OGG, M4A, and AAC audio formats</p>
            
            <div className="dropzone-buttons" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="pill-button primary" onClick={() => document.getElementById('file-input-element')?.click()}>
                <FileAudio size={16} /> Choose Audio Files
              </button>
              <button className="pill-button secondary" onClick={handlePickDirectory}>
                <FolderPlus size={16} /> Select Folder
              </button>
            </div>

            <input 
              id="file-input-element" 
              type="file" 
              multiple 
              accept="audio/*" 
              onChange={handleFileInputChange} 
              style={{ display: 'none' }} 
            />
            <input 
              id="folder-input-element" 
              type="file" 
              webkitdirectory="true" 
              multiple 
              onChange={handleFileInputChange} 
              style={{ display: 'none' }} 
            />
          </div>

          {localTracks.length > 0 && (
            <div className="local-tracks-section" style={{ marginTop: '1.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Music size={18} className="icon-glow" />
                  <strong>Imported Local Audio Tracks ({localTracks.length})</strong>
                </div>

                <div className="tab-filter-bar" style={{ margin: 0, width: '240px' }}>
                  <Search size={14} />
                  <input 
                    type="text" 
                    placeholder="Search local tracks..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="filter-input"
                  />
                </div>
              </div>

              <div className="local-tracks-grid">
                {filteredLocalTracks.map((track) => (
                  <div key={track.id} className="local-track-card glass-card">
                    <div className="track-left">
                      <div className="audio-badge">{track.format}</div>
                      <div className="track-info">
                        <strong className="track-title">{track.name}</strong>
                        <small className="track-meta">{(track.size / (1024 * 1024)).toFixed(2)} MB • {track.source}</small>
                      </div>
                    </div>

                    <div className="track-actions">
                      <button 
                        className="pill-button primary small"
                        onClick={() => handlePlayTrack(track)}
                      >
                        <Play size={14} /> Play Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BACKEND LOCAL DISK SCANNER MODE */}
      {explorerMode === 'backend' && (
        <div className="backend-explorer-section" style={{ marginTop: '1rem' }}>
          <div className="backend-navigation-bar">
            {backendParent && (
              <button 
                className="pill-button secondary small"
                onClick={() => fetchBackendDirectory(backendParent)}
                disabled={loadingBackend}
              >
                <ArrowLeft size={14} /> Parent Directory
              </button>
            )}

            {availableDrives.length > 0 && (
              <div className="drives-selector" style={{ display: 'flex', gap: '0.4rem' }}>
                {availableDrives.map((drive) => (
                  <button
                    key={drive}
                    className={`pill-button small ${backendPath.toLowerCase().startsWith(drive.toLowerCase()) ? 'primary' : 'secondary'}`}
                    onClick={() => fetchBackendDirectory(drive)}
                    disabled={loadingBackend}
                    title={`Switch to ${drive}`}
                  >
                    <HardDrive size={12} /> {drive.replace('\\', '')}
                  </button>
                ))}
              </div>
            )}

            <div className="path-display-box" style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.25rem 0.75rem', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Folder size={16} style={{ color: 'var(--color-primary-light, #a78bfa)', flexShrink: 0 }} /> 
              <input 
                type="text" 
                value={backendPath}
                onChange={(e) => setBackendPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchBackendDirectory(backendPath);
                  }
                }}
                placeholder="Enter directory path (e.g. D:\PROJECT\Music Mirror)..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  width: '100%',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <button 
              className="pill-button primary small"
              onClick={() => fetchBackendDirectory(backendPath)}
              disabled={loadingBackend}
            >
              <RefreshCw size={14} className={loadingBackend ? 'spin' : ''} /> Scan Path
            </button>
          </div>

          {backendError && (
            <div className="alert-box error" style={{ marginTop: '1rem' }}>
              {backendError}
            </div>
          )}

          <div className="tab-filter-bar" style={{ marginTop: '1rem' }}>
            <Search size={14} />
            <input 
              type="text" 
              placeholder="Search current folder..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="backend-items-container" style={{ marginTop: '1rem' }}>
            {loadingBackend ? (
              <div className="loading-state">Scanning local disk items...</div>
            ) : filteredBackendItems.length === 0 ? (
              <div className="empty-state">No items found in this directory.</div>
            ) : (
              <ul className="file-tree-list">
                {filteredBackendItems.map((item, idx) => (
                  <li key={idx} className={`tree-item ${item.is_dir ? 'directory' : 'file'}`}>
                    <div className="item-info">
                      {item.is_dir ? (
                        <Folder size={18} className="icon-dir" />
                      ) : item.is_audio ? (
                        <FileAudio size={18} className="icon-audio" />
                      ) : (
                        <FileText size={18} className="icon-code" />
                      )}
                      <span className="file-path">{item.name}</span>
                    </div>

                    <div className="item-actions">
                      {!item.is_dir && item.size > 0 && (
                        <span className="file-size">{(item.size / 1024).toFixed(1)} KB</span>
                      )}

                      {item.is_dir ? (
                        <button 
                          className="action-btn-view"
                          onClick={() => fetchBackendDirectory(item.path)}
                        >
                          Open Folder
                        </button>
                      ) : item.is_audio ? (
                        <button 
                          className="action-btn-play"
                          onClick={() => handlePlayTrack(item, true)}
                        >
                          <Play size={12} /> Stream Track
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
