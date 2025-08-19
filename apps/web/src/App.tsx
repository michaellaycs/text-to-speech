import React, { useState } from 'react'
import { TextArea, AudioPlayer } from '@/components/ui'
import { DEFAULT_JOKES } from '@/utils/constants'
import './App.css'

// Test TextArea + Convert Button
const App: React.FC = () => {
  const [text, setText] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [audioData, setAudioData] = useState(null)
  const [progress, setProgress] = useState(0)
  const [selectedVoice, setSelectedVoice] = useState('Brian')
  const [darkMode, setDarkMode] = useState(true)

  const handleJokeSelect = (jokeId: string) => {
    if (jokeId === '') {
      setText('')
      return
    }
    
    const selectedJoke = DEFAULT_JOKES.find(joke => joke.id === jokeId)
    if (selectedJoke) {
      setText(selectedJoke.content)
    }
  }

  const handleConvert = async () => {
    if (!text.trim()) return
    
    setIsConverting(true)
    setProgress(0)
    console.log('Converting text:', text)
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 200)
    
    try {
      const response = await fetch('http://localhost:5002/api/tts/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          settings: { volume: 75, playbackSpeed: 1.0, voice: selectedVoice }
        })
      })
      
      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response data:', result)
      
      if (response.ok) {
        setProgress(100)
        setAudioData(result)
        console.log('✅ Conversion successful! Audio ID:', result.id)
      } else {
        alert('Conversion failed: ' + result.error?.message)
      }
      
    } catch (error) {
      console.error('Conversion error:', error)
      alert('Error: ' + error.message)
    } finally {
      clearInterval(progressInterval)
      setTimeout(() => {
        setIsConverting(false)
        setProgress(0)
      }, 500)
    }
  }

  const themeStyles = {
    backgroundColor: darkMode ? '#121212' : '#ffffff',
    color: darkMode ? '#ffffff' : '#000000',
    minHeight: '100vh'
  }

  const cardStyles = {
    backgroundColor: darkMode ? '#1e1e1e' : '#fafafa',
    border: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
  }

  const audioResultStyles = {
    backgroundColor: darkMode ? '#1b5e20' : '#f1f8e9',
    border: `1px solid ${darkMode ? '#4caf50' : '#c8e6c9'}`
  }

  return (
    <div className="app" style={themeStyles}>
      <header className="app-header" style={{
        backgroundColor: darkMode ? '#1e1e1e' : '#ffffff', 
        background: darkMode ? '#1e1e1e' : '#ffffff', // Override gradient
        borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        padding: '20px',
        margin: 0
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto'}}>
          <div>
            <h1 style={{color: darkMode ? '#ffffff' : '#000000', margin: '0 0 5px 0'}}>StandUp Voice</h1>
            <p style={{color: darkMode ? '#b0b0b0' : '#666666', margin: 0}}>Text-to-Speech for Comedy Material Testing</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '8px 16px',
              backgroundColor: darkMode ? '#333' : '#f5f5f5',
              color: darkMode ? '#fff' : '#000',
              border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>
      <main className="app-main" style={{padding: '20px'}}>
        <section className="text-input-section">
          <h2 style={{color: darkMode ? '#ffffff' : '#000000'}}>Enter Your Comedy Material</h2>
          <p className="section-description" style={{color: darkMode ? '#b0b0b0' : '#666666'}}>
            Type or paste your jokes, stories, or any text you'd like to hear spoken aloud.
          </p>
          <div style={{padding: '20px', borderRadius: '8px', ...cardStyles}}>
            <div style={{marginBottom: '15px'}}>
              <label style={{
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: darkMode ? '#e0e0e0' : '#333'
              }}>
                Quick Comedy Selection:
              </label>
              <select
                onChange={(e) => handleJokeSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${darkMode ? '#555' : '#ccc'}`,
                  fontSize: '14px',
                  backgroundColor: darkMode ? '#333' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#000000',
                  cursor: 'pointer'
                }}
                defaultValue=""
              >
                <option value="">-- Select a default joke --</option>
                {DEFAULT_JOKES.map(joke => (
                  <option key={joke.id} value={joke.id}>
                    {joke.title}
                  </option>
                ))}
              </select>
            </div>
            <TextArea
              value={text}
              onChange={setText}
              placeholder="Enter your comedy material here..."
              rows={5}
            />
            <div style={{marginTop: '10px', marginBottom: '15px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{color: darkMode ? '#b0b0b0' : '#666'}}>{text.length}/2000 characters</span>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <label style={{fontSize: '14px', fontWeight: '500', color: darkMode ? '#e0e0e0' : '#333'}}>Voice:</label>
                  <select 
                    value={selectedVoice} 
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: `1px solid ${darkMode ? '#555' : '#ccc'}`,
                      fontSize: '14px',
                      backgroundColor: darkMode ? '#333' : '#ffffff',
                      color: darkMode ? '#ffffff' : '#000000'
                    }}
                  >
                    <option value="Brian">🇬🇧 British English (Brian)</option>
                    <option value="Amy">🇬🇧 British English (Amy)</option>
                    <option value="Emma">🇬🇧 British English (Emma)</option>
                    <option value="Joanna">🇺🇸 American English (Joanna)</option>
                    <option value="Matthew">🇺🇸 American English (Matthew)</option>
                    <option value="Ivy">🇺🇸 American English (Ivy)</option>
                    <option value="Justin">🇺🇸 American English (Justin)</option>
                    <option value="Kendra">🇺🇸 American English (Kendra)</option>
                    <option value="Joey">🇺🇸 American English (Joey)</option>
                    <option value="Salli">🇺🇸 American English (Salli)</option>
                    <option value="Nicole">🇦🇺 Australian English (Nicole)</option>
                    <option value="Russell">🇦🇺 Australian English (Russell)</option>
                    <option value="Raveena">🇮🇳 Indian English (Raveena)</option>
                  </select>
                </div>
              </div>
            </div>
            <button 
              onClick={handleConvert}
              disabled={!text.trim() || isConverting}
              style={{
                padding: '12px 24px', 
                backgroundColor: isConverting 
                  ? (darkMode ? '#555' : '#ccc')
                  : (darkMode ? '#4caf50' : '#388e3c'),
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isConverting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'background-color 0.2s',
                boxShadow: isConverting ? 'none' : (darkMode 
                  ? '0 2px 4px rgba(76, 175, 80, 0.4)' 
                  : '0 2px 4px rgba(56, 142, 60, 0.3)')
              }}
            >
              {isConverting ? '🔄 Converting...' : '🎤 Convert to Speech'}
            </button>
            
            {isConverting && (
              <div style={{marginTop: '15px'}}>
                <div style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '8px'
                }}>
                  <span style={{fontSize: '14px', color: darkMode ? '#e0e0e0' : '#333'}}>
                    Processing audio...
                  </span>
                  <span style={{fontSize: '14px', color: darkMode ? '#81c784' : '#388e3c'}}>
                    {Math.round(progress)}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: darkMode ? '#333' : '#e0e0e0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: darkMode ? '#4caf50' : '#388e3c',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}
            
            {audioData && (
              <div style={{marginTop: '20px', padding: '15px', borderRadius: '8px', ...audioResultStyles}}>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '15px'}}>
                  <h4 style={{margin: 0, color: darkMode ? '#81c784' : '#388e3c'}}>🎵 Audio Generated Successfully!</h4>
                </div>
                
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '15px'}}>
                  <div style={{fontSize: '14px', color: darkMode ? '#e0e0e0' : '#333'}}><strong>Service:</strong> {audioData.metadata.ttsService}</div>
                  <div style={{fontSize: '14px', color: darkMode ? '#e0e0e0' : '#333'}}><strong>Voice:</strong> {audioData.metadata.voice || selectedVoice}</div>
                  <div style={{fontSize: '14px', color: darkMode ? '#e0e0e0' : '#333'}}><strong>Duration:</strong> {Math.round(audioData.duration)}s</div>
                  <div style={{fontSize: '14px', color: darkMode ? '#e0e0e0' : '#333'}}><strong>Size:</strong> {Math.round(audioData.metadata.fileSize / 1024)} KB</div>
                </div>
                
                <div style={{padding: '15px', backgroundColor: darkMode ? '#2d2d2d' : '#ffffff', borderRadius: '8px', border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`}}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px'}}>
                    <h5 style={{margin: 0, color: darkMode ? '#e0e0e0' : '#333'}}>🎧 Audio Player</h5>
                    <span style={{fontSize: '12px', color: darkMode ? '#b0b0b0' : '#666'}}>High-quality TTS audio</span>
                  </div>
                  
                  <AudioPlayer
                    src={`http://localhost:5002/api/audio/stream/${audioData.id}`}
                    data-testid="generated-audio-player"
                  />
                  
                  <div style={{marginTop: '10px', fontSize: '12px', color: darkMode ? '#888' : '#666', textAlign: 'center'}}>
                    Audio ID: {audioData.id}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
