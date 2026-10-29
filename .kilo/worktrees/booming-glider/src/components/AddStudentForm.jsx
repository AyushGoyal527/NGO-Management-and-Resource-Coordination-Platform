import { useState } from 'react'

function AddStudentForm({ onAdd }) {
  const [name,  setName]  = useState('')
  const [score, setScore] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!name.trim()) {
      setError('Please enter a student name.')
      return
    }
    const s = Number(score)
    if (score === '' || isNaN(s) || s < 0 || s > 100) {
      setError('Score must be between 0 and 100.')
      return
    }
    onAdd(name.trim(), s)
    setName('')
    setScore('')
    setError('')
  }

  return (
    <div className="form-card">
      <h2>Add Student</h2>

      <div className="form-group">
        <label>Full Name</label>
        <input
          type="text"
          placeholder="e.g. Riya Sharma"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Score (0 – 100)</label>
        <input
          type="number"
          placeholder="e.g. 75"
          min="0"
          max="100"
          value={score}
          onChange={e => setScore(e.target.value)}
        />
      </div>

      <button className="submit-btn" onClick={handleSubmit}>
        + ADD STUDENT
      </button>

      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export default AddStudentForm