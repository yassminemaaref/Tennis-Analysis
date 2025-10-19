import React, { useState, useEffect } from 'react';
import { Upload, Video, BarChart3, Target, Download, RefreshCw, XCircle } from 'lucide-react';

const API_URL = 'http://localhost:5001/api';

export default function TennisAnalysisApp() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [status, setStatus] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [rallyData, setRallyData] = useState(null);
  const [expandedRally, setExpandedRally] = useState(null);

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
        setStatus({ status: 'processing', message: 'Processing video...', progress: 0 });
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
      setStatus(data);

      if (data.status === 'completed') {
        loadStats(id);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const loadStats = async (id) => {
  try {
    const response = await fetch(`${API_URL}/results/${id}/json`);
    const data = await response.json();
    setStatsData(data);
    loadRallies(id);  // Add this line
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
      <header className="header">
        <div className="header-content">
          <div className="header-title">
          <XCircle size={32} color="#60a5fa" />    
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Upload Tennis Video</h2>
              
              <div className="upload-area">
                <Video size={64} />
                <p>{uploadedFile ? uploadedFile.name : 'Select a video file to analyze'}</p>
                <label className="btn btn-primary">
                  <Upload size={20} />
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
                  {status.status === 'processing' && <RefreshCw size={24} color="#60a5fa" className="spin" />}
                  {status.status === 'error' && <XCircle size={24} color="#f87171" />}
                  <h3>{status.message}</h3>
                </div>
                {status.progress !== undefined && (
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${status.progress}%` }} />
                  </div>
                )}
              </div>
            )}

            {statsData && (
              <div>
                
                {/* Video Player */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>Analyzed Video with Statistics Overlay</h3>
                  <video 
                  key={videoId}
                  controls 
                  style={{ width: '100%', borderRadius: '0.5rem', backgroundColor: '#000' }}
                  src={`${API_URL}/results/${videoId}/video`}
                >
                  Your browser does not support video playback.
                </video>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Watch the analyzed video with real-time statistics overlays
                  </p>
                </div>

                {/* Download Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button onClick={() => downloadVideo(videoId)} className="btn btn-primary">
                    <Download size={16} />
                    Download Video
                  </button>
                  <button onClick={() => downloadExcel(videoId)} className="btn btn-success">
                    <Download size={16} />
                    Download Excel
                  </button>
                </div>

                {/* Match Statistics */}
                <div className="grid grid-cols-3">
                  <div className="stat-card">
                    <h3>Total Rallies</h3>
                    <p>{statsData.match_statistics.total_rallies}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Frames Analyzed</h3>
                    <p>{statsData.match_statistics.total_frames_analyzed}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Players</h3>
                    <p>2</p>
                  </div>
                </div>

                {/* Player Stats */}
                <div className="grid grid-cols-2">
                  {Object.entries(statsData.players).map(([key, player]) => {
                    const playerNum = key.split('_')[1];
                    const isPlayer1 = playerNum === '1';
                    
                    return (
                      <div key={key} className={`player-card ${isPlayer1 ? 'player-1' : 'player-2'}`}>
                        <div className="player-header">
                          <div className={`player-avatar ${isPlayer1 ? 'player-1' : 'player-2'}`}>
                            {playerNum}
                          </div>
                          <h2>Player {playerNum}</h2>
                          <div className={`win-rate ${isPlayer1 ? 'player-1' : 'player-2'}`}>
                            {player.win_rate}% Win Rate
                          </div>
                        </div>

                        <div>
                          <StatRow label="Total Shots" value={player.total_shots} />
                          <StatRow label="Serves" value={player.serves} />
                          <StatRow label="Forehand" value={player.estimated_forehand} />
                          <StatRow label="Backhand" value={player.estimated_backhand} />
                          <StatRow label="Distance" value={`${player.total_distance_meters}m`} />
                          <StatRow label="Rallies W/L" value={`${player.rallies_won}/${player.rallies_lost}`} />
                        </div>
                        
                        <div className="court-positioning">
                          <h4>Court Positioning</h4>
                          <div className="court-grid">
                            <div className="court-stat">
                              <span>Left:</span>
                              <span>{player.court_positioning.left_court.toFixed(1)}%</span>
                            </div>
                            <div className="court-stat">
                              <span>Right:</span>
                              <span>{player.court_positioning.right_court.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
 </div>

{/* Rally Analysis Section */}
{rallyData && rallyData.rallies && rallyData.rallies.length > 0 && (
  <div style={{ marginTop: '2rem' }}>
    <div className="card">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white' }}>
        Rally Analysis
      </h2>
      
      {/* Rally Summary Stats */}
      <div className="grid grid-cols-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <h3>Total Rallies</h3>
          <p>{rallyData.total_rallies}</p>
        </div>
        <div className="stat-card">
          <h3>Average Rally Length</h3>
          <p>{rallyData.average_rally_length.toFixed(1)} shots</p>
        </div>
        <div className="stat-card">
          <h3>Longest Rally</h3>
          <p>{rallyData.longest_rally} shots</p>
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
              border: expandedRally === index ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.2)'
            }}
            onClick={() => setExpandedRally(expandedRally === index ? null : index)}
          >
            {/* Rally Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>
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
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                {rally.total_shots} shots • {rally.duration_seconds.toFixed(1)}s
              </span>
            </div>

            {/* Rally Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                <span style={{ color: '#4ade80', fontSize: '0.75rem' }}>P1 Shots</span>
                <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1.125rem', margin: 0 }}>
                  {rally.player_1_shots}
                </p>
              </div>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                <span style={{ color: '#c084fc', fontSize: '0.75rem' }}>P2 Shots</span>
                <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1.125rem', margin: 0 }}>
                  {rally.player_2_shots}
                </p>
              </div>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>Avg Speed</span>
                <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1.125rem', margin: 0 }}>
                  {rally.average_shot_speed.toFixed(1)} km/h
                </p>
              </div>
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '0.5rem', borderRadius: '0.25rem' }}>
                <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>Max Speed</span>
                <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1.125rem', margin: 0 }}>
                  {rally.max_shot_speed.toFixed(1)} km/h
                </p>
              </div>
            </div>

            {/* Expanded Rally Details */}
            {expandedRally === index && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #475569' }}>
                <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  Rally Details
                </h4>
                
                {/* Distance Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Player 1 Distance</p>
                    <p style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1rem', margin: 0 }}>
                      {rally.player_1_distance.toFixed(2)}m
                    </p>
                  </div>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Player 2 Distance</p>
                    <p style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '1rem', margin: 0 }}>
                      {rally.player_2_distance.toFixed(2)}m
                    </p>
                  </div>
                </div>

                {/* Shot Timeline */}
                <div>
                  <h5 style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Shot Timeline
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {rally.shots.map((shot, shotIndex) => (
                      <div 
                        key={shotIndex}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem',
                          padding: '0.5rem',
                          background: shot.player === 1 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(168, 85, 247, 0.05)',
                          borderRadius: '0.25rem',
                          borderLeft: `3px solid ${shot.player === 1 ? '#4ade80' : '#c084fc'}`
                        }}
                      >
                        <span style={{ 
                          color: shot.player === 1 ? '#4ade80' : '#c084fc', 
                          fontWeight: 'bold',
                          minWidth: '60px'
                        }}>
                          Shot #{shot.shot_number}
                        </span>
                        <span style={{ color: 'white', minWidth: '80px' }}>
                          Player {shot.player}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                          {shot.shot_speed.toFixed(1)} km/h
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: 'auto' }}>
                          Frame {shot.frame}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rally Info */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #475569' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                    {rally.serving_player && (
                      <div>
                        <span style={{ color: '#94a3b8' }}>Server: </span>
                        <span style={{ color: 'white', fontWeight: '600' }}>Player {rally.serving_player}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#94a3b8' }}>Start Frame: </span>
                      <span style={{ color: 'white' }}>{rally.start_frame}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>End Frame: </span>
                      <span style={{ color: 'white' }}>{rally.end_frame}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Expand Indicator */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <span style={{ color: '#60a5fa', fontSize: '0.75rem' }}>
                {expandedRally === index ? '▲ Click to collapse' : '▼ Click to expand details'}
              </span>
            </div>
          </div>
        ))}
      </div>
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
  return (
    <div className="stat-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}