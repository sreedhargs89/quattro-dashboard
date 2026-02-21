import { useState, useEffect } from 'react'
import { Sun, Sunrise, Sunset, Moon, Check, Activity, CheckCircle2, Play, Pause, RotateCcw, Target, Sparkles, TrendingUp, Compass, Focus } from 'lucide-react'
import './App.css'

const MINI_DAYS = [
  { id: 1, name: "Dawn", start: 4, end: 10, theme: "theme-dawn", Icon: Sunrise, desc: "04:00 - 10:00", greeting: "Rise and architect your day." },
  { id: 2, name: "Day", start: 10, end: 16, theme: "theme-day", Icon: Sun, desc: "10:00 - 16:00", greeting: "Execute with ruthless focus." },
  { id: 3, name: "Dusk", start: 16, end: 22, theme: "theme-dusk", Icon: Sunset, desc: "16:00 - 22:00", greeting: "Wind down and wrap up." },
  { id: 4, name: "Night", start: 22, end: 4, theme: "theme-night", Icon: Moon, desc: "22:00 - 04:00", greeting: "Recovery is the foundation." },
];

function getRealTimeMiniDay() {
  const h = new Date().getHours()
  if (h >= 4 && h < 10) return 1
  if (h >= 10 && h < 16) return 2
  if (h >= 16 && h < 22) return 3
  return 4
}

const POMO_MODES = {
  focus: { time: 25 * 60, label: "Focus" },
  shortBreak: { time: 5 * 60, label: "Short Break" },
  longBreak: { time: 15 * 60, label: "Long Break" }
}

export default function App() {
  const [now, setNow] = useState(new Date())
  const [currentMD, setCurrentMD] = useState(getRealTimeMiniDay())
  const [selectedMD, setSelectedMD] = useState(getRealTimeMiniDay())

  // Pomodoro State
  const [pomoMode, setPomoMode] = useState('focus')
  const [timeLeft, setTimeLeft] = useState(POMO_MODES.focus.time)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTaskRef, setActiveTaskRef] = useState(null)

  // Analytics State
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('quattro_stats')
    return saved ? JSON.parse(saved) : { pomodorosCompleted: 0, streak: 0 }
  })

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('quattro_tasks')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { }
    }
    return {
      1: [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }],
      2: [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }],
      3: [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }],
      4: [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }]
    }
  })

  useEffect(() => { localStorage.setItem('quattro_tasks', JSON.stringify(tasks)) }, [tasks])
  useEffect(() => { localStorage.setItem('quattro_stats', JSON.stringify(stats)) }, [stats])

  // Real-time Master Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
      const realTimeId = getRealTimeMiniDay()
      if (currentMD !== realTimeId) setCurrentMD(realTimeId)
    }, 1000)
    return () => clearInterval(timer)
  }, [currentMD])

  // Pomodoro Timer Engine
  useEffect(() => {
    let interval = null
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1)
      }, 1000)
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false)
      if (pomoMode === 'focus') {
        setStats(prev => ({ ...prev, pomodorosCompleted: prev.pomodorosCompleted + 1 }))
        // Auto check task if focused? Let's leave manual checking for satisfaction
      }
      const nextMode = pomoMode === 'focus' ? 'shortBreak' : 'focus'
      setPomoMode(nextMode)
      setTimeLeft(POMO_MODES[nextMode].time)
      const audio = new Audio('/beep.mp3')
      audio.play().catch(e => e)
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, pomoMode])

  useEffect(() => {
    const theme = MINI_DAYS.find(md => md.id === currentMD)?.theme
    document.body.className = theme || 'theme-dawn'
  }, [currentMD])

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  const getDayStatus = (mdId) => {
    if (currentMD === 4 && mdId !== 4) return 'completed'
    if (mdId < currentMD) return 'completed'
    if (mdId === currentMD) return 'active'
    return 'upcoming'
  }

  const activeData = MINI_DAYS.find(md => md.id === selectedMD)
  const isCurrentView = selectedMD === currentMD
  const status = getDayStatus(selectedMD)

  let progressPct = 0
  let timeLeftString = ''
  if (isCurrentView) {
    let startHour = activeData.start
    let startObj = new Date(now)
    startObj.setHours(startHour, 0, 0, 0)
    if (activeData.id === 4 && now.getHours() < 4) startObj.setDate(startObj.getDate() - 1)
    const elapsedMs = now - startObj
    const totalMs = 6 * 60 * 60 * 1000
    progressPct = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100))
    const remainingMs = totalMs - elapsedMs
    const rHours = Math.floor(remainingMs / (1000 * 60 * 60))
    const rMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
    timeLeftString = `${rHours}h ${rMins}m remaining`
  }

  const handleTaskChange = (mdId, index, newText) => {
    setTasks(prev => {
      const dayTasks = [...prev[mdId]]
      dayTasks[index] = { ...dayTasks[index], text: newText }
      return { ...prev, [mdId]: dayTasks }
    })
  }

  const handleTaskToggle = (mdId, index) => {
    setTasks(prev => {
      const dayTasks = [...prev[mdId]]
      dayTasks[index] = { ...dayTasks[index], done: !dayTasks[index].done }
      return { ...prev, [mdId]: dayTasks }
    })
  }

  const handleSetPomoMode = (mode) => {
    setPomoMode(mode)
    setTimeLeft(POMO_MODES[mode].time)
    setIsRunning(false)
  }

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${mins}:${s}`
  }

  const ringRadius = 50
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringStrokeDashoffset = ringCircumference - ((timeLeft / POMO_MODES[pomoMode].time) * ringCircumference)

  // Overall Daily Progress Calculation
  const totalDailyTasks = Object.values(tasks).flat().filter(t => t.text.trim() !== "").length
  const completedDailyTasks = Object.values(tasks).flat().filter(t => t.done && t.text.trim() !== "").length
  const dailyProgress = totalDailyTasks === 0 ? 0 : Math.round((completedDailyTasks / totalDailyTasks) * 100)

  return (
    <div className="app-container animate-in">
      <div className="blob blob-tl" />
      <div className="blob blob-br" />

      <header className="header glass-panel">
        <div className="header-titles">
          <h1 className="brand text-gradient">Quattro</h1>
          <p className="tagline">Four mini days. One incredible life.</p>
        </div>
        <div className="stats-header-group">
          <div className="mini-stat">
            <Focus size={16} /> <span>{stats.pomodorosCompleted} Sessions Boxed</span>
          </div>
          <div className="mini-stat">
            <TrendingUp size={16} /> <span>{dailyProgress}% Daily Ops Target</span>
          </div>
        </div>
        <div className="header-time">
          <div className="real-time">{timeString}</div>
          <div className="real-date">{dateString}</div>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* Left Sidebar Timeline */}
        <section className="timeline-card glass-panel flex-col-justify-between">
          <div>
            <h2>Your Day Flow</h2>
            <div className="timeline-list">
              {MINI_DAYS.map((md) => {
                const itemStatus = getDayStatus(md.id)
                const isSelected = selectedMD === md.id
                const Ico = md.Icon
                const doneCount = tasks[md.id].filter(t => t.done && t.text.trim() !== "").length
                const totalTasks = tasks[md.id].filter(t => t.text.trim() !== "").length

                return (
                  <div
                    key={md.id}
                    className={`timeline-item ${itemStatus} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedMD(md.id)}
                    style={{ opacity: isSelected ? 1 : 0.7 }}
                  >
                    <div className={`timeline-icon-box ${itemStatus === 'active' ? 'pulse-glow' : ''}`}>
                      <Ico size={24} />
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">{md.name}</div>
                      <div className="timeline-time">{md.desc}</div>
                      {totalTasks > 0 && itemStatus === 'completed' && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--completed)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> {doneCount}/{totalTasks} targets hit
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="daily-ops-board">
            <div className="ops-header">
              <h3><Compass size={18} /> Daily Architecture Overview</h3>
            </div>
            <div className="ops-progress">
              <div className="ops-progress-bar">
                <div className="ops-progress-fill" style={{ width: `${dailyProgress}%` }} />
              </div>
              <span className="ops-progress-text">{completedDailyTasks}/{totalDailyTasks} Macro Goals</span>
            </div>
          </div>
        </section>

        {/* Right Detail Panel */}
        <section className="day-details glass-panel key-switch">
          <div className="focus-header">
            <div className="focus-header-titles">
              <h2 className="phase-title">
                <activeData.Icon className="phase-icon" color="var(--accent)" />
                {activeData.name} Phase
              </h2>
              <p className="phase-subtitle">
                {activeData.greeting}
              </p>
            </div>
            <div className="focus-badge">
              {status === 'completed' ? 'Completed Phase' : status === 'active' ? 'Current Focus' : 'Upcoming Phase'}
            </div>
          </div>

          {isCurrentView && status === 'active' && activeData.id !== 4 && (
            <div className="progress-section">
              <div className="progress-meta">
                <span>Phase Progress ({activeData.desc})</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{timeLeftString}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {activeData.id === 4 ? (
            <div className="sleep-block">
              <div className="sleep-icon-glow">
                <Moon />
              </div>
              <h3>Recovery Architecture</h3>
              <p>Top performers know sleep is non-negotiable. This time is exclusively reserved to consolidate learning, repair physically, and prepare your neurochemistry for tomorrow's Dawn Phase.</p>

              <div className="sleep-stats-preview">
                <div className="sleep-stat-box">
                  <span className="stat-num">{stats.pomodorosCompleted}</span>
                  <span className="stat-label">Focus Sessions Run</span>
                </div>
                <div className="sleep-stat-box">
                  <span className="stat-num">{completedDailyTasks}</span>
                  <span className="stat-label">Targets Destroyed</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Pomodoro Timer Engine */}
              {status === 'active' && (
                <div className="pomodoro-container">
                  <div className="pomodoro-header">
                    <h3>Deep Work Engine</h3>
                    <div className="pomo-modes">
                      {Object.keys(POMO_MODES).map(key => (
                        <button
                          key={key}
                          className={`pomo-mode-btn ${pomoMode === key ? 'active' : ''}`}
                          onClick={() => handleSetPomoMode(key)}
                        >
                          {POMO_MODES[key].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pomodoro-body">
                    <div className="pomodoro-ring-wrapper">
                      <svg className="pomo-svg" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r={ringRadius} stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                        <circle
                          cx="60" cy="60" r={ringRadius}
                          stroke="var(--accent)"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringStrokeDashoffset}
                          strokeLinecap="round"
                          transform="rotate(-90 60 60)"
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <div className="pomo-time">{formatTime(timeLeft)}</div>
                    </div>

                    <div className="pomodoro-actions">
                      <p className="pomo-active-task-label">
                        {activeTaskRef && activeTaskRef.mdId === activeData.id && tasks[activeData.id][activeTaskRef.index].text.trim() !== "" ? (
                          <><span>Executing:</span> {tasks[activeData.id][activeTaskRef.index].text}</>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>System idle. Select a target to lock in.</span>
                        )}
                      </p>

                      <div className="pomo-controls">
                        <button className={`pomo-main-btn ${isRunning ? 'running' : ''}`} onClick={() => setIsRunning(!isRunning)}>
                          {isRunning ? <Pause size={20} /> : <Play size={20} />}
                          {isRunning ? 'Halt Session' : 'Commence Deep Work'}
                        </button>
                        <button className="pomo-reset-btn" onClick={() => handleSetPomoMode(pomoMode)} title="Reset Box Component">
                          <RotateCcw size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Task List */}
              <div className="tasks-box">
                <div className="tasks-header">
                  <h3><Activity size={20} /> Macro Directives (Top 3)</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Non-negotiable outcomes.</span>
                </div>
                <div className="task-list">
                  {tasks[activeData.id].map((task, idx) => {
                    const isActivePomodoro = activeTaskRef?.mdId === activeData.id && activeTaskRef?.index === idx
                    return (
                      <div key={idx} className={`task-item ${task.done ? 'completed' : ''} ${isActivePomodoro ? 'task-focused' : ''}`} onClick={() => { if (status === 'active') setActiveTaskRef({ mdId: activeData.id, index: idx }) }}>
                        <button
                          className="checkbox"
                          onClick={(e) => { e.stopPropagation(); handleTaskToggle(activeData.id, idx); }}
                        >
                          {task.done && <Check size={16} strokeWidth={3} />}
                        </button>
                        <input
                          type="text"
                          className="task-input"
                          placeholder={`Architectural Goal 0${idx + 1}`}
                          value={task.text}
                          onChange={(e) => handleTaskChange(activeData.id, idx, e.target.value)}
                          onFocus={() => { if (status === 'active') setActiveTaskRef({ mdId: activeData.id, index: idx }) }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {status === 'active' && !task.done && (
                          <button
                            className={`pomo-link-btn ${isActivePomodoro ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTaskRef({ mdId: activeData.id, index: idx }); }}
                            title="Lock Target in Pomodoro"
                          >
                            <Target size={18} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Messages */}
          {status === 'completed' && activeData.id !== 4 && (
            <div className="message-box message-completed">
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                <Sparkles size={18} color="var(--completed)" />
                <p><strong>Phase Executed.</strong> The parameters above represent the architectural outcomes achieved during the {activeData.name} block.</p>
              </div>
            </div>
          )}

          {status === 'upcoming' && activeData.id !== 4 && (
            <div className="message-box message-upcoming">
              <p><strong>Foresight Engineering:</strong> Strategize your top 3 non-negotiables for the upcoming {activeData.name} block now to minimize friction during execution.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
