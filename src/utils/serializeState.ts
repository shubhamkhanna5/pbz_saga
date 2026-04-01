
import { AppState } from "../types";

export function serializeState(state: AppState) {
  return {
    Players: (state.players || []).map(p => [
      p.id,
      p.name,
      JSON.stringify(p.badges || [])
    ]),

    Leagues: (state.pastLeagues || []).concat(state.activeLeague ? [state.activeLeague] : []).map(l => [
      l.id,
      l.name,
      l.name, // sagaName (using name as default if sagaName missing in type)
      l.startDate,
      l.endedAt || "",
      l.status
    ]),

    Tournaments: (state.pastTournaments || []).concat(state.activeTournament ? [state.activeTournament] : []).map(t => [
      t.id,
      t.name,
      t.date,
      t.name, // sagaName
      t.courts,
      t.status
    ]),

    Stages: (() => {
      const stages: any[] = [];
      const leagues = (state.pastLeagues || []).concat(state.activeLeague ? [state.activeLeague] : []);
      leagues.forEach(l => {
         (l.days || []).forEach(d => {
             stages.push([
                 d.id,
                 d.week,
                 d.day,
                 d.week,
                 d.date,
                 l.name,
                 l.name
             ]);
         });
      });
      return stages;
    })(),

    Matches: (() => {
        const matches: any[] = [];
        // League Matches
        const leagues = (state.pastLeagues || []).concat(state.activeLeague ? [state.activeLeague] : []);
        leagues.forEach(l => {
            (l.days || []).forEach(d => {
                (d.matches || []).forEach(m => {
                    matches.push([
                        m.id,
                        d.id,
                        m.type,
                        m.teamA.join(","),
                        m.teamB.join(","),
                        d.date,
                        l.name,
                        l.name,
                        ""
                    ]);
                });
            });
        });
        // Tournament Matches
        const tourneys = (state.pastTournaments || []).concat(state.activeTournament ? [state.activeTournament] : []);
        tourneys.forEach(t => {
            (t.matches || []).forEach(m => {
                const meta = m.groupId ? `GROUP:${m.groupId}` : m.bracketRound ? `BRACKET:${m.bracketRound}` : "";
                matches.push([
                    m.id,
                    t.id,
                    'singles', // Default mode for storage if not on match
                    m.teamA.join(","),
                    m.teamB.join(","),
                    t.date,
                    t.name,
                    meta,
                    t.name
                ]);
            });
        });
        return matches;
    })(),

    Scores: (() => {
        const scores: any[] = [];
        // Helper to push scores
        const processMatch = (m: any, date: number, saga: string, league: string, tourney: string) => {
             if (m.isCompleted || m.status === 'completed') {
                 if (m.scoreA !== undefined && m.scoreB !== undefined) {
                     const winnerIds = m.scoreA > m.scoreB ? m.teamA : m.teamB;
                     const loserIds = m.scoreA > m.scoreB ? m.teamB : m.teamA;
                     scores.push([
                         `${m.id}_score`,
                         m.id,
                         m.scoreA,
                         m.scoreB,
                         winnerIds.join(","),
                         loserIds.join(","),
                         date,
                         saga,
                         league,
                         tourney
                     ]);
                 }
             }
        };

        const leagues = (state.pastLeagues || []).concat(state.activeLeague ? [state.activeLeague] : []);
        leagues.forEach(l => {
            (l.days || []).forEach(d => {
                (d.matches || []).forEach(m => processMatch(m, d.date, l.name, l.name, ""));
            });
        });

        const tourneys = (state.pastTournaments || []).concat(state.activeTournament ? [state.activeTournament] : []);
        tourneys.forEach(t => {
            (t.matches || []).forEach(m => processMatch(m, t.date, t.name, "", t.name));
        });

        return scores;
    })()
  };
}
