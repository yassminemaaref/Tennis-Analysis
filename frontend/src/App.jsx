import React, { useState, useEffect } from 'react';
import { Upload, Video, BarChart3, Download, RefreshCw, XCircle } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:5001/api';

// Helper function to convert pixels/sec to km/h
// Assumes average tennis court is ~23.77m long and calculates scale from video
function convertPixelsPerSecToKmh(pixelsPerSec, courtPixelHeight = 720, courtRealHeightMeters = 23.77) {
  // Calculate pixels per meter ratio
  const pixelsPerMeter = courtPixelHeight / courtRealHeightMeters;
  
  // Convert pixels/sec to meters/sec
  const metersPerSec = pixelsPerSec / pixelsPerMeter;
  
  // Convert meters/sec to km/h (multiply by 3.6)
  const kmPerHour = metersPerSec * 3.6;
  
  return kmPerHour;
}

// Alternative: Use a typical scale factor if we don't have court dimensions
function estimateSpeedKmh(pixelsPerSec) {
  // Typical scale: ~30 pixels = 1 meter in standard HD video of tennis court
  const estimatedPixelsPerMeter = 30;
  const metersPerSec = pixelsPerSec / estimatedPixelsPerMeter;
  const kmPerHour = metersPerSec * 3.6;
  return kmPerHour;
}

export default function TennisAnalysisApp() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [status, setStatus] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [rallyData, setRallyData] = useState(null);
  const [expandedRally, setExpandedRally] = useState(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (videoId && status?.status === 'processing') {
      const interval = setInterval(() => {
        checkStatus(videoId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [videoId, status]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const loadRallies = async (id) => {
    try {
      const response = await fetch(`${API_URL}/results/${id}/rallies`);
      const data = await response.json();
      setRallyData(data);
    } catch (error) {
      console.error('Error loading rallies:', error);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      alert('Please select a video file first');
      return;
    }

    setVideoReady(false);
    setStatsData(null);
    setRallyData(null);

    const formData = new FormData();
    formData.append('video', uploadedFile);

    try {
      setStatus({ status: 'uploading', message: 'Uploading video...' });
      
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setVideoId(data.video_id);
        setStatus({ status: 'processing', message: 'Running tennis analysis...', progress: 0 });
        setActiveTab('results');
      } else {
        setStatus({ status: 'error', message: data.error });
      }
    } catch (error) {
      setStatus({ status: 'error', message: 'Upload failed: ' + error.message });
    }
  };

  const checkStatus = async (id) => {
    try {
      const response = await fetch(`${API_URL}/status/${id}`);
      const data = await response.json();
      
      const wasProcessing = status?.status === 'processing';
      setStatus(data);

      if (data.status === 'completed' && wasProcessing) {
        await loadStats(id);
        setVideoReady(true);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const loadStats = async (id) => {
    try {
      const response = await fetch(`${API_URL}/results/${id}/json`);
      const data = await response.json();
      console.log('📊 Stats Data Loaded:', data);
      
      // CRITICAL FIX: Access players from the nested structure
      const player1 = data.players?.player_1 || data.player_1;
      const player2 = data.players?.player_2 || data.player_2;
      
      console.log('👤 Player 1 Full Object:', player1);
      console.log('🔑 Player 1 Keys:', player1 ? Object.keys(player1) : 'undefined');
      console.log('👤 Player 2 Full Object:', player2);
      console.log('🔑 Player 2 Keys:', player2 ? Object.keys(player2) : 'undefined');
      
      // Create corrected data structure
      const correctedData = {
        ...data,
        player_1: player1,
        player_2: player2
      };
      
      setStatsData(correctedData);
      loadRallies(id);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const downloadVideo = (id) => {
    window.open(`${API_URL}/results/${id}/video/download`, '_blank');
  };

  const downloadExcel = (id) => {
    window.open(`${API_URL}/results/${id}/excel`, '_blank');
  };

  return (
    <div>
      {/* Visible Green Tennis Court Background */}
      <div className="tennis-court-background">
        <div className="court-surface">
          <div className="court-outer">
            <div className="court-line court-net"></div>
            <div className="court-line court-center"></div>
            <div className="court-line service-line-top"></div>
            <div className="court-line service-line-bottom"></div>
          </div>
        </div>
      </div>

      <header className="header">
        <div className="header-content">
          <div className="header-title">
            {/* Animated Tennis Racket Logo */}
            <div className="tennis-racket-logo">
              <div className="racket">
                <div className="racket-head"></div>
                <div className="racket-handle"></div>
              </div>
              <div className="logo-ball"></div>
            </div>
            <h1>Tennis Analysis System</h1>
          </div>
          <div className="header-buttons">
            <button
              onClick={() => setActiveTab('upload')}
              className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Upload size={16} />
              Upload
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <BarChart3 size={16} />
              Results
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            <div className="card">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                Upload Tennis Video
              </h2>
              
              <div className="upload-area">
                <Video size={64} strokeWidth={1.5} />
                <p>{uploadedFile ? uploadedFile.name : 'Select a video file to analyze'}</p>
                <label className="btn btn-primary">
                  <Upload size={18} />
                  Choose Video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {uploadedFile && (
                <button
                  onClick={handleUpload}
                  disabled={status?.status === 'uploading'}
                  className="btn btn-success"
                  style={{ width: '100%' }}
                >
                  {status?.status === 'uploading' ? 'Uploading...' : 'Start Analysis'}
                </button>
              )}

              {status && status.status === 'error' && (
                <div className="error-message">
                  {status.message}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div>
            {status && status.status !== 'completed' && (
              <div className="status-card">
                <div className="status-header">
                  {status.status === 'processing' && (
                    <RefreshCw size={24} color="#16a34a" className="spin" strokeWidth={2.5} />
                  )}
                  {status.status === 'error' && (
                    <XCircle size={24} color="#ef4444" strokeWidth={2.5} />
                  )}
                  <h3>{status.message}</h3>
                </div>
                
                {/* Horizontal Progress Bar with Tennis Ball */}
                {status.progress !== undefined && (
                  <div className="progress-bar-container">
                    <div className="progress-bar-wrapper">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${status.progress}%` }}
                      >
                        <div className="progress-tennis-ball"></div>
                      </div>
                    </div>
                    <div className="progress-text">
                      {status.progress}% Complete
                    </div>
                  </div>
                )}
              </div>
            )}

            {statsData && videoReady && (
              <div>
                {/* Video Player */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Analyzed Video with Statistics Overlay
                  </h3>
                  
                  <video 
                    controls 
                    style={{ 
                      width: '100%', 
                      borderRadius: '0.5rem', 
                      backgroundColor: '#000',
                      maxHeight: '600px'
                    }}
                    src={`${API_URL}/results/${videoId}/video`}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>

                {/* Download Buttons */}
                <div className="button-group">
                  <button onClick={() => downloadVideo(videoId)} className="btn btn-primary">
                    <Download size={16} />
                    Download Video
                  </button>
                  <button onClick={() => downloadExcel(videoId)} className="btn btn-success">
                    <Download size={16} />
                    Download Excel
                  </button>
                </div>

                {/* Summary Statistics */}
                <div className="grid grid-cols-3" style={{ marginBottom: '1.5rem' }}>
                  <div className="stat-card">
                    <h3>Total Rallies</h3>
                    <p>{statsData.match_statistics?.total_rallies || statsData.total_rallies || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Frames Analyzed</h3>
                    <p>{statsData.match_statistics?.total_frames_analyzed || statsData.total_frames || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Players</h3>
                    <p>2</p>
                  </div>
                </div>

                {/* Players Side by Side */}
                <div className="players-container">
                  {/* Player 1 Stats */}
                  <div className="card player-1-bg">
                    <div className="player-header">
                      <div className="player-badge player-1">1</div>
                      <div style={{ flex: 1 }}>
                        <h3>Player 1</h3>
                        <span className="win-rate player-1">
                          {statsData.player_1?.win_rate ? `${(statsData.player_1.win_rate * 100).toFixed(0)}% Win Rate` : '0%'}
                        </span>
                      </div>
                    </div>
                    <div className="stat-grid">
                      <StatRow 
                        label="Total Shots" 
                        value={statsData.player_1?.total_shots || 0} 
                      />
                      <StatRow 
                        label="Average Speed" 
                        value={
                          statsData.player_1?.average_speed_pixels_per_sec 
                            ? `${estimateSpeedKmh(statsData.player_1.average_speed_pixels_per_sec).toFixed(1)} km/h` 
                            : '0.0 km/h'
                        } 
                      />
                      <StatRow 
                        label="Max Speed" 
                        value={
                          statsData.player_1?.max_speed_pixels_per_sec 
                            ? `${estimateSpeedKmh(statsData.player_1.max_speed_pixels_per_sec).toFixed(1)} km/h` 
                            : '0.0 km/h'
                        } 
                      />
                      <StatRow 
                        label="Distance Moved" 
                        value={
                          statsData.player_1?.total_distance_meters 
                            ? `${statsData.player_1.total_distance_meters.toFixed(2)} m` 
                            : '0.0 m'
                        } 
                      />
                    </div>
                  </div>

                  {/* Player 2 Stats */}
                  <div className="card player-2-bg">
                    <div className="player-header">
                      <div className="player-badge player-2">2</div>
                      <div style={{ flex: 1 }}>
                        <h3>Player 2</h3>
                        <span className="win-rate player-2">
                          {statsData.player_2?.win_rate ? `${(statsData.player_2.win_rate * 100).toFixed(0)}% Win Rate` : '0%'}
                        </span>
                      </div>
                    </div>
                    <div className="stat-grid">
                      <StatRow 
                        label="Total Shots" 
                        value={statsData.player_2?.total_shots || 0} 
                      />
                      <StatRow 
                        label="Average Speed" 
                        value={
                          statsData.player_2?.average_speed_pixels_per_sec 
                            ? `${estimateSpeedKmh(statsData.player_2.average_speed_pixels_per_sec).toFixed(1)} km/h` 
                            : '0.0 km/h'
                        } 
                      />
                      <StatRow 
                        label="Max Speed" 
                        value={
                          statsData.player_2?.max_speed_pixels_per_sec 
                            ? `${estimateSpeedKmh(statsData.player_2.max_speed_pixels_per_sec).toFixed(1)} km/h` 
                            : '0.0 km/h'
                        } 
                      />
                      <StatRow 
                        label="Distance Moved" 
                        value={
                          statsData.player_2?.total_distance_meters 
                            ? `${statsData.player_2.total_distance_meters.toFixed(2)} m` 
                            : '0.0 m'
                        } 
                      />
                    </div>
                  </div>
                </div>

                {/* Rally Analysis Section */}
                {rallyData && rallyData.rallies && rallyData.rallies.length > 0 && (
                  <div className="card">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                      Rally Analysis
                    </h2>
                    
                    {/* Rally Summary Stats */}
                    <div className="grid grid-cols-3" style={{ marginBottom: '1.5rem' }}>
                      <div className="stat-card">
                        <h3>Total Rallies</h3>
                        <p>{rallyData.total_rallies}</p>
                      </div>
                      <div className="stat-card">
                        <h3>Average Length</h3>
                        <p>{rallyData.average_rally_length.toFixed(1)}</p>
                      </div>
                      <div className="stat-card">
                        <h3>Longest Rally</h3>
                        <p>{rallyData.longest_rally}</p>
                      </div>
                    </div>

                    {/* Individual Rallies */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {rallyData.rallies.map((rally, index) => (
                        <div 
                          key={index}
                          className="card"
                          style={{ 
                            cursor: 'pointer',
                            border: expandedRally === index ? '3px solid #16a34a' : '2px solid rgba(34, 197, 94, 0.3)'
                          }}
                          onClick={() => setExpandedRally(expandedRally === index ? null : index)}
                        >
                          {/* Rally Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                                Rally #{rally.rally_number}
                              </h3>
                              {rally.winner && (
                                <span 
                                  className={`win-rate ${rally.winner === 1 ? 'player-1' : 'player-2'}`}
                                  style={{ fontSize: '0.75rem' }}
                                >
                                  Winner: Player {rally.winner}
                                </span>
                              )}
                            </div>
                            <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: '600' }}>
                              {rally.total_shots} shots • {rally.duration_seconds.toFixed(1)}s
                            </span>
                          </div>

                          {/* Rally Quick Stats */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: '0.75rem', borderRadius: '0.5rem', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
                              <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '700' }}>P1 Shots</span>
                              <p style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>
                                {rally.player_1_shots}
                              </p>
                            </div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '0.75rem', borderRadius: '0.5rem', border: '2px solid rgba(139, 92, 246, 0.3)' }}>
                              <span style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: '700' }}>P2 Shots</span>
                              <p style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>
                                {rally.player_2_shots}
                              </p>
                            </div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.75rem', borderRadius: '0.5rem', border: '2px solid rgba(59, 130, 246, 0.3)' }}>
                              <span style={{ color: '#60a5fa', fontSize: '0.75rem', fontWeight: '700' }}>Avg Speed</span>
                              <p style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>
                                {rally.average_shot_speed.toFixed(0)}
                              </p>
                            </div>
                            <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '0.75rem', borderRadius: '0.5rem', border: '2px solid rgba(234, 179, 8, 0.3)' }}>
                              <span style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: '700' }}>Max Speed</span>
                              <p style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>
                                {rally.max_shot_speed.toFixed(0)}
                              </p>
                            </div>
                          </div>

                          {/* Expanded Rally Details */}
                          {expandedRally === index && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid rgba(51, 65, 85, 0.5)' }}>
                              {/* Distance Stats */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '0.75rem', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
                                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>Player 1 Distance</p>
                                  <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '1.5rem', margin: 0 }}>
                                    {rally.player_1_distance.toFixed(2)}m
                                  </p>
                                </div>
                                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '1rem', borderRadius: '0.75rem', border: '2px solid rgba(139, 92, 246, 0.3)' }}>
                                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>Player 2 Distance</p>
                                  <p style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '1.5rem', margin: 0 }}>
                                    {rally.player_2_distance.toFixed(2)}m
                                  </p>
                                </div>
                              </div>

                              {/* Shot Timeline */}
                              <div>
                                <h5 style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem' }}>
                                  Shot Timeline
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                                  {rally.shots.map((shot, shotIndex) => (
                                    <div 
                                      key={shotIndex}
                                      style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: shot.player === 1 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                        borderRadius: '0.5rem',
                                        borderLeft: `4px solid ${shot.player === 1 ? '#22c55e' : '#a78bfa'}`,
                                        fontSize: '0.95rem'
                                      }}
                                    >
                                      <span style={{ 
                                        color: shot.player === 1 ? '#22c55e' : '#a78bfa', 
                                        fontWeight: 'bold',
                                        minWidth: '70px'
                                      }}>
                                        Shot #{shot.shot_number}
                                      </span>
                                      <span style={{ color: '#e2e8f0', minWidth: '80px', fontWeight: '600' }}>
                                        Player {shot.player}
                                      </span>
                                      <span style={{ color: '#94a3b8', fontWeight: '600' }}>
                                        {shot.shot_speed.toFixed(1)} km/h
                                      </span>
                                      <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: 'auto' }}>
                                        Frame {shot.frame}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Expand Indicator */}
                          <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                            <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: '700' }}>
                              {expandedRally === index ? '▲ Click to collapse' : '▼ Click to expand details'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!status && !statsData && (
              <div className="empty-state">
                No results yet. Upload a video to get started.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  const displayValue = value !== undefined && value !== null ? value : '—';
  
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span>{displayValue}</span>
    </div>
  );
}
