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