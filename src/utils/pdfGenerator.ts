import { LeagueDay, Player, LeagueMatch, LeagueStanding, Tournament, TournamentMatch } from '../types';

declare global {
  interface Window {
    jspdf: any;
  }
}

/**
 * Draws a standardized header for a specific Day (Chapter)
 */
const drawDayHeader = (doc: any, sagaName: string, dayLabel: string, week: number, y: number): number => {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(sagaName.toUpperCase(), 105, y, { align: "center" });
  y += 8;
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(`WEEK ${week} • DAY ${dayLabel}`, 105, y, { align: "center" });
  doc.setTextColor(0);
  
  y += 10;
  doc.setDrawColor(180);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  return y + 15;
};

const drawMatchBox = (doc: any, match: LeagueMatch, getPlayerName: (id: string) => string, x: number, y: number) => {
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  
  if (match.status === 'walkover') doc.setFillColor(245, 245, 255);
  else if (match.isCompleted) doc.setFillColor(245, 255, 245);
  else doc.setFillColor(252, 252, 252);
  
  doc.roundedRect(x, y, 170, 24, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  const modeLabel = match.type.toUpperCase();
  const statusLabel = match.status === 'walkover' ? ' • WALKOVER' : match.isForfeit ? ' • FORFEIT' : '';
  const podLabel = match.podId 
    ? `${match.cycleIndex && match.cycleIndex > 0 ? 'SWAPPED ' : ''}${match.podId.toUpperCase()} MATCHES` 
    : `COURT ${match.courtId}`;
  
  doc.text(`${podLabel} • ${modeLabel}${statusLabel}`, x + 5, y + 8);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  
  const tA = match.teamA.map(getPlayerName).join(' / ');
  const tB = match.teamB.map(getPlayerName).join(' / ');
  
  let text = `${tA}  vs  ${tB}`;
  if (match.isCompleted && match.scoreA !== undefined) {
    text = `${tA} (${match.scoreA})  vs  (${match.scoreB}) ${tB}`;
  }
  doc.text(text, x + 5, y + 18);
};

export const generateMatchDayPDF = (
  leagueName: string,
  day: LeagueDay,
  players: Player[],
  onError?: (msg: string) => void
) => {
  let jsPDFConstructor;
  try {
    const lib = window.jspdf || (window as any).jspdf;
    if (lib) jsPDFConstructor = lib.jsPDF;
  } catch (e) { console.error(e); }

  if (!jsPDFConstructor) { 
    if (onError) onError('PDF Engine not loaded.');
    else alert('PDF Engine not loaded.'); 
    return; 
  }

  const doc = new jsPDFConstructor();
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  let y = 20;

  const dayLabel = `${day.day || 1}`;
  const week = day.week || 1;
  y = drawDayHeader(doc, leagueName, dayLabel, week, y);

  // Dynamic Stage Detection
  // Determine total stages from the actual generated matches rather than static config
  const maxStage = day.matches.length > 0 
    ? Math.max(...day.matches.map(m => m.round))
    : 0;

  const stages = Array.from({ length: maxStage }, (_, i) => i + 1);

  stages.forEach(stageNum => {
    const matches = day.matches.filter(m => m.round === stageNum);
    if (matches.length === 0) return;

    const spaceNeeded = 10 + (matches.length * 30) + 10;
    if (y + spaceNeeded > 280) { doc.addPage(); y = 20; }

    // Stage Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(230, 230, 230); 
    doc.rect(20, y - 6, 170, 8, 'F');
    doc.setTextColor(0);
    doc.text(`STAGE ${stageNum}`, 24, y);
    y += 8;

    // Draw Matches
    matches.forEach(m => {
      drawMatchBox(doc, m, getPlayerName, 20, y);
      y += 28;
    });
    y += 8; // Spacing after stage
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont("helvetica", "italic");
  const timestamp = new Date().toLocaleString();
  doc.text(`PickleBallZ Saga • Week ${day.week} Day ${day.day} • Updated: ${timestamp}`, 105, pageHeight - 10, { align: "center" });
  doc.setTextColor(0);

  doc.save(`${leagueName.replace(/\s+/g, '_')}_Week${day.week}_Day${day.day}.pdf`);
};

/**
 * GENERATES THE FINAL SAGA SUMMARY REPORT (DBZ STYLE)
 */
export const generateLeagueGloryPDF = (
  leagueName: string,
  standings: LeagueStanding[],
  players: Player[],
  onError?: (msg: string) => void
) => {
  let jsPDFConstructor;
  try {
    const lib = window.jspdf || (window as any).jspdf;
    if (lib) jsPDFConstructor = lib.jsPDF;
  } catch (e) { 
    console.error(e); 
    if (onError) onError('PDF Engine failed to initialize.');
    return; 
  }

  const doc = new jsPDFConstructor();
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  
  const COLORS = {
    red: [220, 38, 38],
    gold: [218, 165, 32],
    purple: [147, 51, 234],
    gray: [156, 163, 175],
    black: [0, 0, 0],
    white: [255, 255, 255]
  };

  let y = 20;

  // Filter for Trophies (Eligibility)
  const eligible = standings.filter(s => s.eligibleForTrophies);
  const ineligible = standings.filter(s => !s.eligibleForTrophies);

  const champion = eligible[0];
  const runnerUp = eligible[1];
  
  // Last Place (From eligible list, or overall if no one is eligible)
  const lastPlace = [...eligible].reverse()[0] ?? [...ineligible].reverse()[0];

  // Totals
  const totalGamesPlayed = standings.reduce((sum, s) => sum + s.gamesPlayed, 0);
  const totalNoShows = standings.reduce((sum, s) => sum + s.noShows, 0);

  // --- HEADER ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.red);
  doc.text(`PBZ SAGA – ${leagueName.toUpperCase()}`, 14, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);
  const dateStr = new Date().toDateString();
  doc.text(`Saga Complete • Generated: ${dateStr}`, 14, y);

  y += 12;

  // --- TROPHIES OF THE SAGA ---
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.purple);
  doc.text("🏆 TROPHIES OF THE SAGA", 14, y);
  y += 8;

  // Champion Box
  if (champion) {
      doc.setFillColor(255, 250, 240); // Light Gold BG
      doc.setDrawColor(...COLORS.gold);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, y, 180, 25, 3, 3, 'FD');
      
      doc.setFontSize(16);
      doc.setTextColor(...COLORS.gold);
      doc.text("🥇 SAGA CHAMPION", 20, y + 10);
      
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.black);
      doc.text(getPlayerName(champion.playerId).toUpperCase(), 20, y + 18);
      
      doc.setFontSize(10);
      doc.text(`${champion.ppg} PPG • ${champion.wins} Wins`, 120, y + 18);
      y += 32;
  }

  // Runner Up & Yamcha
  doc.setFontSize(11);
  if (runnerUp) {
      doc.setTextColor(...COLORS.gray);
      doc.text("🥈 ELITE Z-FIGHTER", 14, y);
      doc.setTextColor(...COLORS.black);
      doc.text(getPlayerName(runnerUp.playerId), 60, y);
      y += 8;
  }
  
  if (lastPlace) {
      doc.setTextColor(...COLORS.red);
      doc.text("💀 YAMCHA AWARD", 14, y);
      doc.setTextColor(...COLORS.black);
      doc.text(getPlayerName(lastPlace.playerId), 60, y);
      y += 12;
  }

  // --- LEAGUE STATS ---
  doc.setDrawColor(200);
  doc.line(14, y, 194, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.black);
  doc.text(`TOTAL BATTLES: ${totalGamesPlayed}`, 14, y);
  doc.text(`TOTAL NO-SHOWS: ${totalNoShows}`, 80, y);
  y += 12;

  // --- FULL LEADERBOARD ---
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.red);
  doc.text("📊 FINAL POWER LEVELS", 14, y);
  y += 8;

  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y, 180, 8, 'F');
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  
  doc.text("RK", 16, y + 5);
  doc.text("FIGHTER", 30, y + 5);
  doc.text("ELIG", 90, y + 5);
  doc.text("PTS", 115, y + 5, { align: "right" });
  doc.text("PPG", 135, y + 5, { align: "right" });
  doc.text("W-L", 160, y + 5, { align: "right" });
  doc.text("NS", 185, y + 5, { align: "right" });
  
  y += 12;

  // Table Body
  standings.forEach((s, idx) => {
      // Page Break
      if (y > 270) {
          doc.addPage();
          y = 20;
      }

      const name = getPlayerName(s.playerId);
      const isEligible = s.eligibleForTrophies;
      
      // Styling
      if (isEligible) {
          doc.setTextColor(...COLORS.black);
          doc.setFont("helvetica", "bold");
      } else {
          doc.setTextColor(...COLORS.gray);
          doc.setFont("helvetica", "normal");
      }

      // Rank
      doc.text(`${idx + 1}`, 16, y);
      
      // Name
      if (idx === 0 && isEligible) doc.setTextColor(...COLORS.gold);
      doc.text(name, 30, y);
      
      // Reset color for stats
      if (isEligible) doc.setTextColor(...COLORS.black);
      else doc.setTextColor(...COLORS.gray);

      // Eligibility
      const eligText = isEligible ? "YES" : "NO";
      if (!isEligible) doc.setTextColor(...COLORS.red);
      else doc.setTextColor(...COLORS.black);
      doc.text(eligText, 90, y);

      // Stats
      if (isEligible) doc.setTextColor(...COLORS.black);
      else doc.setTextColor(...COLORS.gray);
      
      doc.text(`${s.points}`, 115, y, { align: "right" });
      doc.text(s.ppg.toFixed(2), 135, y, { align: "right" });
      doc.text(`${s.wins}-${s.losses}`, 160, y, { align: "right" });
      
      // No Shows (Highlight if > 0)
      if (s.noShows > 0) doc.setTextColor(...COLORS.red);
      doc.text(`${s.noShows}`, 185, y, { align: "right" });

      // Divider
      doc.setDrawColor(240);
      doc.setLineWidth(0.1);
      doc.line(14, y + 2, 194, y + 2);

      y += 8;
  });

  // --- FOOTER ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.setFont("helvetica", "italic");
  doc.text("Results locked. Power levels are final. No rewrites. No excuses.", 105, pageHeight - 10, { align: "center" });

  doc.save(`PBZ_${leagueName.replace(/\s+/g, '_')}_Final_Standings.pdf`);
};

export const exportBracketPDF = (
  tournament: Tournament,
  players: Player[],
  onError?: (msg: string) => void
) => {
  let jsPDFConstructor;
  try {
    const lib = window.jspdf || (window as any).jspdf;
    if (lib) jsPDFConstructor = lib.jsPDF;
  } catch (e) { 
    console.error(e); 
    if (onError) onError('PDF Engine failed to initialize.');
    return; 
  }

  if (!jsPDFConstructor) {
    if (onError) onError('PDF Engine not loaded.');
    else alert('PDF Engine not loaded.');
    return;
  }
  const doc = new jsPDFConstructor();
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  const getTeamName = (team: string[]) => team.map(getPlayerName).join(' & ');

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(tournament.name.toUpperCase(), 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("TOURNAMENT BRACKET", 105, 26, { align: "center" });
  doc.setTextColor(0);

  let y = 40;

  const matches = tournament.matches.filter(m => m.bracketRound);
  const semis = matches.filter(m => m.bracketRound === 'semi');
  const final = matches.find(m => m.bracketRound === 'final');
  const third = matches.find(m => m.bracketRound === 'third_place');

  const drawLine = (m: TournamentMatch) => {
      const tA = m.teamA.length ? getTeamName(m.teamA) : 'TBD';
      const tB = m.teamB.length ? getTeamName(m.teamB) : 'TBD';
      const score = m.status === 'completed' ? `${m.scoreA} - ${m.scoreB}` : 'vs';
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`${tA}  vs  ${tB}`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(score, 160, y, { align: "right" });
      doc.setDrawColor(200);
      doc.line(20, y + 2, 180, y + 2);
      y += 15;
  };

  if (semis.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(230);
      doc.rect(20, y-6, 160, 8, 'F');
      doc.text("SEMI-FINALS", 24, y);
      y += 10;
      semis.forEach(drawLine);
      y += 10;
  }

  if (final) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(255, 215, 0); 
      doc.rect(20, y-6, 160, 8, 'F');
      doc.text("CHAMPIONSHIP FINAL", 24, y);
      y += 10;
      drawLine(final);
      y += 10;
  }

  if (third) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(200);
      doc.rect(20, y-6, 160, 8, 'F');
      doc.text("3RD PLACE MATCH", 24, y);
      y += 10;
      drawLine(third);
  }

  doc.save(`${tournament.name.replace(/\s+/g, '_')}_Bracket.pdf`);
};
