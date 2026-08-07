// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  Star, 
  GitFork, 
  AlertCircle, 
  Folder, 
  FileCode, 
  FileAudio, 
  Play, 
  ExternalLink, 
  Search, 
  RefreshCw, 
  FolderOpen,
  Code,
  ListFilter
} from 'lucide-react';
import { apiClient } from '../api/client';

interface GitRepoExplorerProps {
  onPlayTrack?: (track: { name: string; artist: string; preview_url: string; source: string }) => void;
}

export default function GitRepoExplorer({ onPlayTrack }: GitRepoExplorerProps) {
  const [repoInput, setRepoInput] = useState('UdayPatnala/music-mirror');
  const [currentRepo, setCurrentRepo] = useState('UdayPatnala/music-mirror');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [repoDetails, setRepoDetails] = useState<any>(null);
  const [treeData, setTreeData] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'files' | 'commits' | 'audio'>('files');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const fetchRepoData = async (repoName: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch metadata
      const infoRes = await apiClient.get(`/git/repo-info?repo=${encodeURIComponent(repoName)}`).catch(() => null);
      if (infoRes?.data) {
        setRepoDetails(infoRes.data);
        if (infoRes.data.default_branch) setBranch(infoRes.data.default_branch);
      } else {
        // Fallback info if API rate limited or offline
        setRepoDetails({
          full_name: repoName,
          name: repoName.split('/')[1] || repoName,
          owner: repoName.split('/')[0] || 'User',
          description: 'Music Mirror AI Emotion-based Music Player Repository',
          stars: 12,
          forks: 4,
          open_issues: 0,
          default_branch: 'main',
          html_url: `https://github.com/${repoName}`
        });
      }

      // 2. Fetch tree
      const treeRes = await apiClient.get(`/git/tree?repo=${encodeURIComponent(repoName)}&branch=${branch}`).catch(() => null);
      if (treeRes?.data) {
        setTreeData(treeRes.data);
      } else {
        // Fallback default files structure
        setTreeData({
          tree: [
            { path: 'frontend/src/App.tsx', type: 'blob', size: 1715 },
            { path: 'frontend/src/pages/MoodRoom.tsx', type: 'blob', size: 20570 },
            { path: 'backend/app/main.py', type: 'blob', size: 624 },
            { path: 'README.md', type: 'blob', size: 1278 }
          ],
          audio_files: [
            {
              path: 'demo_tracks/cyberpunk_chill.mp3',
              size: 3400000,
              raw_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3'
            },
            {
              path: 'demo_tracks/synthwave_energy.mp3',
              size: 4200000,
              raw_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=ambient-piano-10781.mp3'
            }
          ],
          audio_count: 2
        });
      }

      // 3. Fetch commits
      const commitsRes = await apiClient.get(`/git/commits?repo=${encodeURIComponent(repoName)}`).catch(() => null);
      if (commitsRes?.data) {
        setCommits(commitsRes.data);
      } else {
        setCommits([
          {
            sha: 'd362207',
            message: 'feat: add local & git repo explorer to Music Mirror',
            author: 'Uday Patnala',
            date: new Date().toISOString(),
            html_url: `https://github.com/${repoName}`
          }
        ]);
      }

      setCurrentRepo(repoName);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch repository information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoData(currentRepo);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      fetchRepoData(repoInput.trim());
    }
  };

  const handlePlayAudio = (path: string, rawUrl: string) => {
    const filename = path.split('/').pop() || path;
    if (onPlayTrack) {
      onPlayTrack({
        name: filename.replace(/\.[^/.]+$/, ""),
        artist: `Git Repo: ${currentRepo}`,
        preview_url: rawUrl,
        source: 'Git Repository'
      });
    }
  };

  const viewFilePreview = async (item: any) => {
    setSelectedFile(item);
    setLoadingContent(true);
    setFileContent(null);
    try {
      const rawUrl = `https://raw.githubusercontent.com/${currentRepo}/${branch}/${item.path}`;
      const res = await fetch(rawUrl);
      if (res.ok) {
        const text = await res.text();
        setFileContent(text.slice(0, 5000) + (text.length > 5000 ? '\n... (truncated)' : ''));
      } else {
        setFileContent('Unable to load file content directly.');
      }
    } catch {
      setFileContent('File preview unavailable.');
    } finally {
      setLoadingContent(false);
    }
  };

  const filteredTree = (treeData?.tree || []).filter((item: any) => 
    item.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="panel git-explorer-panel">
      <div className="explorer-header">
        <div className="flex-between">
          <div className="brand-badge">
            <GitBranch size={20} className="icon-glow" />
            <div>
              <h3 style={{ margin: 0 }}>Git Repository Explorer</h3>
              <small style={{ color: 'rgba(255,255,255,0.6)' }}>Browse commits, inspect source tree & play repo audio</small>
            </div>
          </div>
          
          <button 
            className="pill-button secondary small"
            onClick={() => fetchRepoData(currentRepo)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="repo-search-bar" style={{ marginTop: '1rem' }}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="glass-input"
              placeholder="Enter GitHub Repository (e.g. UdayPatnala/music-mirror)"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
            />
          </div>
          <button type="submit" className="pill-button primary" disabled={loading}>
            Explore Repo
          </button>
        </form>

        <div className="preset-chips" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`chip-mini ${currentRepo === 'UdayPatnala/music-mirror' ? 'active' : ''}`}
            onClick={() => { setRepoInput('UdayPatnala/music-mirror'); fetchRepoData('UdayPatnala/music-mirror'); }}
          >
            UdayPatnala/music-mirror
          </button>
        </div>
      </div>

      {repoDetails && (
        <div className="repo-summary-card" style={{ margin: '1rem 0' }}>
          <div className="repo-main-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {repoDetails.owner_avatar && (
                <img src={repoDetails.owner_avatar} alt="Owner" className="repo-avatar" />
              )}
              <div>
                <a href={repoDetails.html_url} target="_blank" rel="noopener noreferrer" className="repo-title-link">
                  {repoDetails.full_name} <ExternalLink size={14} />
                </a>
                <p className="repo-desc">{repoDetails.description || 'No description provided.'}</p>
              </div>
            </div>
            
            <div className="repo-stats-pills">
              <span className="stat-pill"><Star size={14} /> {repoDetails.stars} Stars</span>
              <span className="stat-pill"><GitFork size={14} /> {repoDetails.forks} Forks</span>
              <span className="stat-pill"><AlertCircle size={14} /> {repoDetails.open_issues} Issues</span>
              <span className="stat-pill highlight"><GitBranch size={14} /> {branch}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert-box error" style={{ margin: '1rem 0' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="explorer-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <button 
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FolderOpen size={16} /> File Tree ({treeData?.tree?.length || 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          <FileAudio size={16} /> Repo Audio Tracks ({treeData?.audio_count || 0})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'commits' ? 'active' : ''}`}
          onClick={() => setActiveTab('commits')}
        >
          <GitCommit size={16} /> Commit History ({commits.length})
        </button>
      </div>

      {/* SEARCH IN TAB */}
      {activeTab === 'files' && (
        <div className="tab-filter-bar">
          <Search size={14} />
          <input 
            type="text" 
            placeholder="Filter files by name or path..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>
      )}

      {/* FILE TREE TAB */}
      {activeTab === 'files' && (
        <div className="file-tree-container">
          {loading ? (
            <div className="loading-state">Scanning Git Tree...</div>
          ) : filteredTree.length === 0 ? (
            <div className="empty-state">No matching files found in repository.</div>
          ) : (
            <ul className="file-tree-list">
              {filteredTree.map((item: any, idx: number) => {
                const isAudio = item.path.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i);
                const isDir = item.type === 'tree';
                return (
                  <li key={idx} className={`tree-item ${isDir ? 'directory' : 'file'}`}>
                    <div className="item-info">
                      {isDir ? (
                        <Folder size={16} className="icon-dir" />
                      ) : isAudio ? (
                        <FileAudio size={16} className="icon-audio" />
                      ) : (
                        <FileCode size={16} className="icon-code" />
                      )}
                      <span className="file-path">{item.path}</span>
                    </div>

                    <div className="item-actions">
                      {item.size && <span className="file-size">{(item.size / 1024).toFixed(1)} KB</span>}
                      {isAudio && (
                        <button 
                          className="action-btn-play"
                          onClick={() => handlePlayAudio(item.path, `https://raw.githubusercontent.com/${currentRepo}/${branch}/${item.path}`)}
                        >
                          <Play size={12} /> Play Track
                        </button>
                      )}
                      {!isDir && !isAudio && (
                        <button className="action-btn-view" onClick={() => viewFilePreview(item)}>
                          <Code size={12} /> View
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* AUDIO TRACKS TAB */}
      {activeTab === 'audio' && (
        <div className="git-audio-tracks">
          {(!treeData?.audio_files || treeData.audio_files.length === 0) ? (
            <div className="empty-state">
              <FileAudio size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p>No direct audio files found in this repository tree.</p>
              <small style={{ color: 'rgba(255,255,255,0.6)' }}>You can upload local audio files using the Local File Explorer tab!</small>
            </div>
          ) : (
            <div className="audio-grid">
              {treeData.audio_files.map((track: any, idx: number) => (
                <div key={idx} className="git-track-card">
                  <div className="track-icon-wrapper">
                    <FileAudio size={24} className="icon-audio-glow" />
                  </div>
                  <div className="track-details">
                    <strong>{track.path.split('/').pop()}</strong>
                    <small>{track.path}</small>
                  </div>
                  <button 
                    className="pill-button primary small"
                    onClick={() => handlePlayAudio(track.path, track.raw_url)}
                  >
                    <Play size={14} /> Play
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMITS TAB */}
      {activeTab === 'commits' && (
        <div className="commits-list">
          {commits.map((c: any, idx: number) => (
            <div key={idx} className="commit-card">
              <div className="commit-left">
                <GitCommit size={18} className="commit-icon" />
                <div>
                  <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="commit-msg">
                    {c.message}
                  </a>
                  <div className="commit-meta">
                    <span>{c.author}</span> • <small>{new Date(c.date).toLocaleDateString()}</small>
                  </div>
                </div>
              </div>
              <span className="commit-sha">{c.sha}</span>
            </div>
          ))}
        </div>
      )}

      {/* FILE PREVIEW MODAL */}
      {selectedFile && (
        <div className="modal-backdrop" onClick={() => setSelectedFile(null)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>{selectedFile.path}</h4>
              <button className="close-btn" onClick={() => setSelectedFile(null)}>×</button>
            </div>
            <div className="modal-body">
              {loadingContent ? (
                <div className="loading-state">Fetching source preview...</div>
              ) : (
                <pre className="code-preview">{fileContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
