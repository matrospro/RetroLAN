const EventEmitter = require('events')
const path = require('path')
const os = require('os')
const fs = require('fs')

class Tournament extends EventEmitter {
  constructor () {
    super()
    this.tournaments = []
    this.configPath = path.join(os.homedir(), '.retrolan-tournaments.json')
    this._load()
  }
  _load () {
    try { this.tournaments = JSON.parse(fs.readFileSync(this.configPath, 'utf8')) } catch (e) { this.tournaments = [] }
  }
  _save () { fs.writeFileSync(this.configPath, JSON.stringify(this.tournaments, null, 2)) }

  create ({ name, game, players, teamSize = 1 }) {
    const id = `t-${Date.now()}`
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    let teams = []
    if (teamSize > 1) {
      for (let i = 0; i < shuffled.length; i += teamSize) teams.push(shuffled.slice(i, i + teamSize))
    } else {
      teams = shuffled.map(p => [p])
    }
    const bracket = this._generateBracket(teams)
    const t = { id, name, game, teamSize, teams, bracket, matches: [], scores: {}, createdAt: Date.now(), active: true }
    this.tournaments.push(t)
    this._save()
    return t
  }
  _generateBracket (teams) {
    const rounds = []
    let current = teams.map((t, i) => ({ id: i, players: t, seed: i + 1 }))
    while (current.length > 1) {
      const next = []
      const round = { matches: [] }
      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 < current.length) {
          const m = { id: `${rounds.length}-${i / 2}`, team1: current[i], team2: current[i + 1], winner: null, scores: {} }
          round.matches.push(m)
          next.push({ id: `w-${rounds.length}-${i / 2}`, players: [], seed: 0 })
        } else {
          next.push(current[i])
        }
      }
      rounds.push(round)
      current = next
    }
    return rounds
  }
  setScore (tournamentId, matchId, team1Score, team2Score) {
    const t = this.tournaments.find(t => t.id === tournamentId)
    if (!t) return null
    for (const round of t.bracket) {
      for (const match of round.matches) {
        if (match.id === matchId) {
          match.scores = { team1: team1Score, team2: team2Score }
          match.winner = team1Score > team2Score ? 'team1' : 'team2'
          this._save()
          return match
        }
      }
    }
    return null
  }
  getTournaments () { return this.tournaments }
  start () {}
  stop () {}
}
module.exports = { Tournament }
