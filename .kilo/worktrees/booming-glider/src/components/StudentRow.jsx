import { useState } from 'react'

function StudentRow({ student, onUpdate }) {
  const [draft, setDraft] = useState(student.score)

  const initials = student.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isPassing = student.score >= 40

  function handleUpdate() {
    const val = Number(draft)
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onUpdate(student.id, val)
    }
  }

  return (
    <tr>
      <td>
        <div className="student-name">
          <div className="avatar">{initials}</div>
          {student.name}
        </div>
      </td>

      <td>
        <div className="score-cell">
          <input
            type="number"
            className="score-input"
            min="0"
            max="100"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <button className="update-btn" onClick={handleUpdate}>
            Save
          </button>
        </div>
      </td>

      <td className="status-cell">
        <span className={`status-badge ${isPassing ? 'status-pass' : 'status-fail'}`}>
          {isPassing ? 'PASS' : 'FAIL'}
        </span>
      </td>
    </tr>
  )
}

export default StudentRow