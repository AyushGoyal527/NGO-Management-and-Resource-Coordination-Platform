function Header({ total }) {
  return (
    <header className="header">
      <div>
        <h1>Scoreboard</h1>
        <p className="subtitle">Web Dev II — Unit 3</p>
      </div>
      <span className="badge">{total} STUDENTS</span>
    </header>
  )
}

export default Header