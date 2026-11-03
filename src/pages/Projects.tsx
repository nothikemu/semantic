import { fmtDate } from '../lib/dates'
import { projectProgress } from '../lib/derive'
import { useStore } from '../lib/store'
import { useEditors } from '../components/Editors'
import { AssignmentRow } from '../components/rows'
import { Button, CourseTag, Empty, Icon, PageHeader } from '../components/ui'

export function Projects() {
  const { db, put } = useStore()
  const ed = useEditors()
  return (
    <div className="page">
      <PageHeader title="Projects" sub="Bigger work broken into milestones and smaller tasks." actions={<Button onClick={() => ed.open('project')}><Icon name="plus" size={18} /> Add project</Button>} />
      {db.projects.length ? db.projects.map((p) => {
        const pr = projectProgress(db, p.id)
        const tasks = db.assignments.filter((a) => a.projectId === p.id)
        return (
          <section className="project" key={p.id} aria-labelledby={`p-${p.id}`}>
            <div className="sec-head">
              <h2 id={`p-${p.id}`}>{p.title}</h2>
              <Button size="sm" variant="ghost" onClick={() => ed.open('project', p)}><Icon name="edit" size={16} /> Edit</Button>
            </div>
            <div className="meta"><CourseTag course={db.courses.find((c) => c.id === p.courseId)} />{p.targetDate && <span>Target {fmtDate(p.targetDate)}</span>}</div>
            <div className="progress"><div className="bar-track" role="progressbar" aria-valuenow={pr.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.title} progress`}><div style={{ width: pr.pct + '%' }} /></div><span>{pr.done} of {pr.total} done · {pr.pct}%</span></div>
            <h3>Milestones</h3>
            {p.milestones.length ? <ul className="subs big">{p.milestones.map((m) => (
              <li key={m.id}><label><input type="checkbox" checked={m.done} onChange={() => put('projects', { ...p, milestones: p.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) })} /> <span className={m.done ? 'struck' : ''}>{m.title}</span>{m.date && <span className="muted"> · {fmtDate(m.date)}</span>}</label></li>))}</ul> : <p className="quiet">No milestones yet. Edit the project to add some.</p>}
            <div className="sec-head"><h3>Tasks</h3><Button size="sm" variant="secondary" onClick={() => ed.open('assignment', { projectId: p.id, courseId: p.courseId })}>Add task</Button></div>
            {tasks.length ? <ul className="list">{tasks.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul> : <p className="quiet">No tasks linked. Tasks are assignments with this project selected.</p>}
          </section>
        )
      }) : <Empty title="No projects yet" action={<Button onClick={() => ed.open('project')}>Add a project</Button>}>Use a project for a paper, lab or presentation that has several steps.</Empty>}
    </div>
  )
}
