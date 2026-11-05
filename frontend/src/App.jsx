import React, { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Server, GitBranch, BarChart3,
  FileText, Network, Zap, Radio, ChevronLeft, ChevronRight
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Services from './pages/Services'
import Traces from './pages/Traces'
import Metrics from './pages/Metrics'
import Logs from './pages/Logs'
import Architecture from './pages/Architecture'
import Simulate from './pages/Simulate'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Overview' },
  { path: '/services', icon: Server, label: 'Services' },
  { path: '/traces', icon: GitBranch, label: 'Traces' },
  { path: '/metrics', icon: BarChart3, label: 'Metrics' },
  { path: '/logs', icon: FileText, label: 'Logs' },
  { path: '/architecture', icon: Network, label: 'Architecture' },
  { path: '/simulate', icon: Zap, label: 'Simulate' },
]

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-bg-secondary border-r border-bg-border transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-bg-border ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-text-primary">TraceWatch</div>
              <div className="text-xs text-text-muted">Telemetry Platform</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-bg-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-text-muted hover:bg-bg-card hover:text-text-primary transition-all"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
          <Route path="/traces" element={<Traces />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/simulate" element={<Simulate />} />
        </Routes>
      </main>
    </div>
  )
}
