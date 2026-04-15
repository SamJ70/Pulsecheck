import { useState } from 'react'
import Home from './pages/Home'
import Results from './pages/Results'
import './App.css'

export default function App() {
  const [query, setQuery] = useState('')
  const [activePage, setActivePage] = useState('home')
  const [searchQuery, setSearchQuery] = useState('')

  function handleSearch(q) {
    setSearchQuery(q)
    setActivePage('results')
  }

  function goHome() {
    setActivePage('home')
    setSearchQuery('')
  }

  return (
    <div className="app">
      {activePage === 'home' && <Home onSearch={handleSearch} />}
      {activePage === 'results' && <Results query={searchQuery} onBack={goHome} onSearch={handleSearch} />}
    </div>
  )
}