import { useState, useEffect, useRef } from 'react'
import { api, fetchAgents, fetchProjectSummaries, type Agent, type ProjectSummary } from '../api'
import { PRIORITY_COLORS } from '../lib/constants'
import { useContexts } from '../lib/ContextsProvider'
import './CreateTask.css'

interface Props {
  open: boolean
  defaultDate?: string
  onClose: () => void
  onCreated: (id: string) => void
}

export default function CreateTask({ open, defaultDate, onClose, onCreated }: Props) {
  const { contexts, getColor } = useContexts()
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('personal')
  const [priority, setPriority] = useState<number | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [project, setProject] = useState('')
  const [agentPath, setAgentPath] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Only fetch agents/projects when the modal actually opens — not on mount.
  // Fetching on mount triggers scanAgents() which walks the home directory
  // on startup, causing macOS TCC to prompt for every protected folder.
  useEffect(() => {
    if (open) {
      fetchAgents().then(setAgents)
      fetchProjectSummaries().then(setProjects)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setTitle('')
      setContext('personal')
      setPriority(null)
      setDueDate(defaultDate ?? '')
      setProject('')
      setAgentPath('')
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open, defaultDate])

  function handleContextChange(newContext: string) {
    setContext(newContext)
    setProject('')
    setAgentPath('')
  }

  function handleProjectChange(newProject: string) {
    setProject(newProject)
    // Clear agent if it no longer matches the new project filter
    if (agentPath) {
      const agent = agents.find(a => a.path === agentPath)
      if (agent && agent.project && newProject.trim() && agent.project !== newProject.trim()) {
        setAgentPath('')
      }
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const data = await api.createTask({
        title: title.trim(),
        context,
        my_priority: priority ?? undefined,
        due_date: dueDate || undefined,
        project: project.trim() || undefined,
        agent_path: agentPath || undefined,
      } as any)
      onCreated(data.id)
      onClose()
    } catch (err: any) {
      console.error('[CreateTask] submit failed:', err?.message ?? err)
      alert(`Failed to create task: ${err?.message ?? 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="create-task-overlay" onClick={onClose}>
      <div className="create-task-modal" onClick={e => e.stopPropagation()}>
        <div className="create-task-header">
          <span className="create-task-title">New Task</span>
          <button className="create-task-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="create-task-form">
          <input
            ref={titleRef}
            className="create-task-input"
            placeholder="Task title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
          />

          <div className="create-task-field">
            <span className="create-task-label">Context</span>
            <select
              className="ct-select"
              value={context}
              onChange={e => handleContextChange(e.target.value)}
              style={{ color: getColor(context) }}
            >
              {contexts.map(c => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="create-task-field">
            <span className="create-task-label">Priority</span>
            <div className="create-task-pills">
              {[1,2,3,4,5].map(p => (
                <button
                  key={p}
                  type="button"
                  className={`ct-pill ct-pill-p ${priority === p ? 'active' : ''}`}
                  style={priority === p ? { background: `${PRIORITY_COLORS[p]}20`, color: PRIORITY_COLORS[p], borderColor: `${PRIORITY_COLORS[p]}60` } : {}}
                  onClick={() => setPriority(priority === p ? null : p)}
                >P{p}</button>
              ))}
            </div>
          </div>

          {agents.filter(a =>
            (!a.context || a.context === context) &&
            (!a.project || !project.trim() || a.project === project.trim())
          ).length > 0 && (
            <div className="create-task-field">
              <span className="create-task-label">Agent</span>
              <select
                className="ct-select"
                value={agentPath}
                onChange={e => setAgentPath(e.target.value)}
              >
                <option value="">None</option>
                {agents
                  .filter(a =>
                    (!a.context || a.context === context) &&
                    (!a.project || !project.trim() || a.project === project.trim())
                  )
                  .map(a => (
                    <option key={a.path} value={a.path} title={a.description ?? undefined}>
                      {(!a.context && a.folder) ? `${a.folder} / ${a.name}` : a.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="create-task-row">
            <div className="create-task-field">
              <span className="create-task-label">Due date</span>
              <input
                type="date"
                className="create-task-date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
            <div className="create-task-field">
              <span className="create-task-label">Project</span>
              <input
                type="text"
                list="ct-project-list"
                className="create-task-project"
                value={project}
                onChange={e => handleProjectChange(e.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
              <datalist id="ct-project-list">
                {projects
                  .filter(p => !p.context || p.context === context)
                  .map(p => (
                    <option key={p.name} value={p.name} />
                  ))}
              </datalist>
            </div>
          </div>

          <div className="create-task-actions">
            <button type="button" className="ct-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="ct-submit" disabled={!title.trim() || saving}>
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
