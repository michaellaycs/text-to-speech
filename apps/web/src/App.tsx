import React from 'react'
import { TextInput } from '@/components/features'
import './App.css'

const App: React.FC = () => {
  const handleTextChange = (text: string, isValid: boolean) => {
    console.log('Text changed:', { text: text.substring(0, 50) + '...', isValid, length: text.length })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>StandUp Voice</h1>
        <p>Text-to-Speech for Comedy Material Testing</p>
      </header>
      <main className="app-main">
        <section className="text-input-section">
          <h2>Enter Your Comedy Material</h2>
          <p className="section-description">
            Type or paste your jokes, stories, or any text you'd like to hear spoken aloud.
          </p>
          <TextInput 
            onTextChange={handleTextChange}
            data-testid="main-text-input"
          />
        </section>
      </main>
    </div>
  )
}

export default App
