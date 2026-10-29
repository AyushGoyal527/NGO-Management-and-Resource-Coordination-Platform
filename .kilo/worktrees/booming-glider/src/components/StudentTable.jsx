import StudentRow from './StudentRow'

function StudentTable({ students, onUpdate }) {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <h2>Students</h2>
        <span className="count-pill">{students.length} total</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Score / 100</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <StudentRow key={s.id} student={s} onUpdate={onUpdate} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StudentTable