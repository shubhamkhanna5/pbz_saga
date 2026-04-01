
import { AppState, SkillLevel } from '../types';

export const INITIAL_STATE: AppState = {
  "players": [
    {
      "id": "oe3skdcma",
      "name": "PURU",
      "skill": 2,
      "gamesPlayed": 34,
      "isPresent": true,
      "stats": {
        "wins": 24,
        "losses": 10,
        "currentStreak": 3,
        "clutchWins": 2,
        "bagelsGiven": 3,
        "totalPoints": 278,
        "bonusPoints": 3,
        "noShows": 1,
        "singles": { "wins": 10, "losses": 3, "currentStreak": 3 },
        "doubles": { "wins": 14, "losses": 7, "currentStreak": 3 }
      },
      "badges": [
        { "badgeId": "saga_champion", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "seasonal" },
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "consistent", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "awqcz4mq6",
      "name": "raghvendra",
      "skill": 2,
      "gamesPlayed": 27,
      "isPresent": true,
      "stats": {
        "wins": 17,
        "losses": 10,
        "currentStreak": 2,
        "clutchWins": 0,
        "bagelsGiven": 1,
        "totalPoints": 193,
        "bonusPoints": 1,
        "noShows": 0,
        "singles": { "wins": 3, "losses": 2, "currentStreak": 1 },
        "doubles": { "wins": 14, "losses": 8, "currentStreak": 2 }
      },
      "badges": [
        { "badgeId": "elite_z_warrior", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "seasonal" },
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "fuowaw9d0",
      "name": "rajat",
      "skill": 2,
      "gamesPlayed": 27,
      "isPresent": true,
      "stats": {
        "wins": 16,
        "losses": 11,
        "currentStreak": 1,
        "clutchWins": 0,
        "bagelsGiven": 3,
        "totalPoints": 168,
        "bonusPoints": 3,
        "noShows": 0,
        "singles": { "wins": 4, "losses": 3, "currentStreak": 1 },
        "doubles": { "wins": 12, "losses": 8, "currentStreak": 0 }
      },
      "badges": [
        { "badgeId": "close_third", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "seasonal" },
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "d7xlrfvdn",
      "name": "NISHANT",
      "skill": 2,
      "gamesPlayed": 27,
      "isPresent": true,
      "stats": {
        "wins": 17,
        "losses": 10,
        "currentStreak": 2,
        "clutchWins": 0,
        "bagelsGiven": 2,
        "totalPoints": 212,
        "bonusPoints": 2,
        "noShows": 3,
        "singles": { "wins": 5, "losses": 3, "currentStreak": 0 },
        "doubles": { "wins": 12, "losses": 7, "currentStreak": 2 }
      },
      "badges": [
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "consistent", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "mrauy20h3",
      "name": "AAKASH",
      "skill": 2,
      "gamesPlayed": 26,
      "isPresent": true,
      "stats": {
        "wins": 16,
        "losses": 10,
        "currentStreak": 1,
        "clutchWins": 2,
        "bagelsGiven": 3,
        "totalPoints": 202,
        "bonusPoints": 2,
        "noShows": 1,
        "singles": { "wins": 3, "losses": 3, "currentStreak": 1 },
        "doubles": { "wins": 13, "losses": 7, "currentStreak": 1 }
      },
      "badges": [
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "consistent", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "4p4zbvg98",
      "name": "simar",
      "skill": 2,
      "gamesPlayed": 13,
      "isPresent": true,
      "stats": {
        "wins": 10,
        "losses": 3,
        "currentStreak": -1,
        "clutchWins": 1,
        "bagelsGiven": 1,
        "totalPoints": 127,
        "bonusPoints": 1,
        "noShows": 1,
        "singles": { "wins": 2, "losses": 1, "currentStreak": 0 },
        "doubles": { "wins": 8, "losses": 2, "currentStreak": 4 }
      },
      "badges": [
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "uynls38wb",
      "name": "ANGAD",
      "skill": 2,
      "gamesPlayed": 43,
      "isPresent": true,
      "stats": {
        "wins": 24,
        "losses": 19,
        "currentStreak": -3,
        "clutchWins": 2,
        "bagelsGiven": 6,
        "totalPoints": 303,
        "bonusPoints": 6,
        "noShows": 0,
        "singles": { "wins": 9, "losses": 2, "currentStreak": 4 },
        "doubles": { "wins": 15, "losses": 17, "currentStreak": 0 }
      },
      "badges": [
        { "badgeId": "piccolo_award", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "seasonal" },
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "consistent", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "22rjubyro",
      "name": "ram",
      "skill": 2,
      "gamesPlayed": 28,
      "isPresent": true,
      "stats": {
        "wins": 12,
        "losses": 16,
        "currentStreak": -1,
        "clutchWins": 0,
        "bagelsGiven": 1,
        "totalPoints": 146,
        "bonusPoints": 1,
        "noShows": 0,
        "singles": { "wins": 3, "losses": 1, "currentStreak": 0 },
        "doubles": { "wins": 9, "losses": 15, "currentStreak": 0 }
      },
      "badges": [
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "8aic760jt",
      "name": "SHUBHAM",
      "skill": 2,
      "gamesPlayed": 32,
      "isPresent": false,
      "stats": {
        "wins": 11,
        "losses": 21,
        "currentStreak": 1,
        "clutchWins": 0,
        "bagelsGiven": 8,
        "totalPoints": 216,
        "bonusPoints": 8,
        "noShows": 0,
        "singles": { "wins": 4, "losses": 6, "currentStreak": 1 },
        "doubles": { "wins": 7, "losses": 15, "currentStreak": 0 }
      },
      "badges": [
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "consistent", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    },
    {
      "id": "z64w1cs7r",
      "name": "VISHESH",
      "skill": 2,
      "gamesPlayed": 40,
      "isPresent": true,
      "stats": {
        "wins": 10,
        "losses": 30,
        "currentStreak": -2,
        "clutchWins": 1,
        "bagelsGiven": 5,
        "totalPoints": 240,
        "bonusPoints": 5,
        "noShows": 2,
        "singles": { "wins": 5, "losses": 5, "currentStreak": 0 },
        "doubles": { "wins": 5, "losses": 25, "currentStreak": 0 }
      },
      "badges": [
        { "badgeId": "yamcha_award", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "seasonal" },
        { "badgeId": "iron_body", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "battle_machine", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" },
        { "badgeId": "consistent", "earnedAt": 1774428413878, "leagueId": "p30d9dm1x", "sagaName": "SAIYAN SAGA", "tier": "normal" }
      ]
    }
  ],
  "activeLeague": {
    "id": "p30d9dm1x",
    "name": "SAIYAN SAGA",
    "startDate": 1770728862695,
    "weeks": 4,
    "daysPerWeek": 2,
    "status": "completed",
    "days": [
      {
        "id": "kf6atnt94",
        "week": 1,
        "day": 1,
        "date": 1770728870450,
        "status": "completed",
        "seed": 1109,
        "matches": [],
        "attendees": ["oe3skdcma","uynls38wb","4servd3kc","zqdlnv1uc","mrauy20h3","8wzbd5504","d7xlrfvdn","z64w1cs7r","8aic760jt"],
        "partners": []
      },
      {
        "id": "trkscsidj",
        "week": 1,
        "day": 2,
        "date": 1770740358482,
        "status": "completed",
        "seed": 1208,
        "matches": [],
        "attendees": ["oe3skdcma","uynls38wb","zqdlnv1uc","mrauy20h3","8wzbd5504","d7xlrfvdn","z64w1cs7r","8aic760jt"],
        "partners": []
      },
      {
        "id": "fvbqung2x",
        "week": 2,
        "day": 1,
        "date": 1771118878751,
        "status": "completed",
        "seed": 2108,
        "matches": [],
        "attendees": ["oe3skdcma","uynls38wb","mrauy20h3","d7xlrfvdn","z64w1cs7r","8aic760jt","a6p3l3re5","z0b70zhz7"],
        "partners": []
      },
      {
        "id": "8fsm2aoul",
        "week": 2,
        "day": 2,
        "date": 1771255961467,
        "status": "completed",
        "seed": 2212,
        "matches": [],
        "attendees": ["uynls38wb","zqdlnv1uc","z64w1cs7r","8aic760jt","e4beao6nb","7jtgc1tn7","fuowaw9d0","22rjubyro","34pxxhgma","awqcz4mq6","a5muzcw8q","t1lvqmrot"],
        "partners": []
      },
      {
        "id": "h8vgolhl3",
        "week": 3,
        "day": 1,
        "date": 1771938508505,
        "status": "completed",
        "seed": 3101,
        "matches": [
          { "id": "4dpbizbph", "dayId": "h8vgolhl3", "courtId": 1, "round": 1, "teamA": ["9xsgyve7f"], "teamB": ["4p4zbvg98"], "type": "singles", "scoreA": 7, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 0, "events": [], "highlights": [] },
          { "id": "olqch4ct8", "dayId": "h8vgolhl3", "courtId": 2, "round": 1, "teamA": ["8aic760jt","22rjubyro"], "teamB": ["fuowaw9d0","754pc4n1w"], "type": "doubles", "scoreA": 9, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 1, "events": [], "highlights": [] },
          { "id": "iz86s07xz", "dayId": "h8vgolhl3", "courtId": 3, "round": 1, "teamA": ["awqcz4mq6","a5muzcw8q"], "teamB": ["t1lvqmrot","oe3skdcma"], "type": "doubles", "scoreA": 8, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 2, "events": [], "highlights": [] },
          { "id": "q9v0g0j4z", "dayId": "h8vgolhl3", "courtId": 1, "round": 2, "teamA": ["d7xlrfvdn"], "teamB": ["z64w1cs7r"], "type": "singles", "scoreA": 11, "scoreB": 3, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 3, "events": [], "highlights": [] },
          { "id": "81x806n2g", "dayId": "h8vgolhl3", "courtId": 2, "round": 2, "teamA": ["oe3skdcma","awqcz4mq6"], "teamB": ["fuowaw9d0","22rjubyro"], "type": "doubles", "scoreA": 11, "scoreB": 9, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 4, "events": [], "highlights": [] },
          { "id": "qszpkhwvl", "dayId": "h8vgolhl3", "courtId": 3, "round": 2, "teamA": ["8aic760jt","754pc4n1w"], "teamB": ["a5muzcw8q","t1lvqmrot"], "type": "doubles", "scoreA": 6, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 5, "events": [], "highlights": [] },
          { "id": "ydith0sad", "dayId": "h8vgolhl3", "courtId": 1, "round": 3, "teamA": ["uynls38wb"], "teamB": ["zqdlnv1uc"], "type": "singles", "scoreA": 11, "scoreB": 5, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 6, "events": [], "highlights": [] },
          { "id": "9innck82r", "dayId": "h8vgolhl3", "courtId": 2, "round": 3, "teamA": ["oe3skdcma","fuowaw9d0"], "teamB": ["754pc4n1w","4p4zbvg98"], "type": "doubles", "scoreA": 11, "scoreB": 0, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 7, "events": [], "highlights": [] },
          { "id": "2av97a9u4", "dayId": "h8vgolhl3", "courtId": 3, "round": 3, "teamA": ["8aic760jt","t1lvqmrot"], "teamB": ["22rjubyro","9xsgyve7f"], "type": "doubles", "scoreA": 11, "scoreB": 0, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 8, "events": [], "highlights": [] },
          { "id": "5snwwqj74", "dayId": "h8vgolhl3", "courtId": 1, "round": 4, "teamA": ["a5muzcw8q"], "teamB": ["awqcz4mq6"], "type": "singles", "scoreA": 11, "scoreB": 2, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 9, "events": [], "highlights": [] },
          { "id": "8fos1ysa3", "dayId": "h8vgolhl3", "courtId": 2, "round": 4, "teamA": ["754pc4n1w","t1lvqmrot"], "teamB": ["4p4zbvg98","d7xlrfvdn"], "type": "doubles", "scoreA": 0, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 10, "events": [], "highlights": [] },
          { "id": "kqxzs0cj9", "dayId": "h8vgolhl3", "courtId": 3, "round": 4, "teamA": ["22rjubyro","oe3skdcma"], "teamB": ["fuowaw9d0","9xsgyve7f"], "type": "doubles", "scoreA": 11, "scoreB": 9, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 11, "events": [], "highlights": [] },
          { "id": "ij3f7vg1v", "dayId": "h8vgolhl3", "courtId": 1, "round": 5, "teamA": ["4p4zbvg98","9xsgyve7f"], "teamB": ["uynls38wb","zqdlnv1uc"], "type": "doubles", "scoreA": 11, "scoreB": 6, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 12, "events": [], "highlights": [] },
          { "id": "6ylopxa0z", "dayId": "h8vgolhl3", "courtId": 1, "round": 6, "teamA": ["fuowaw9d0","awqcz4mq6"], "teamB": ["754pc4n1w","d7xlrfvdn"], "type": "doubles", "scoreA": 11, "scoreB": 0, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 13, "events": [], "highlights": [] },
          { "id": "9sws5pk8k", "dayId": "h8vgolhl3", "courtId": 2, "round": 6, "teamA": ["oe3skdcma","a5muzcw8q"], "teamB": ["t1lvqmrot","zqdlnv1uc"], "type": "doubles", "scoreA": 11, "scoreB": 2, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 14, "events": [], "highlights": [] },
          { "id": "zkrh0770o", "dayId": "h8vgolhl3", "courtId": 3, "round": 6, "teamA": ["22rjubyro","z64w1cs7r"], "teamB": ["8aic760jt","uynls38wb"], "type": "doubles", "scoreA": 0, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 15, "events": [], "highlights": [] },
          { "id": "7mqvhfqgm", "dayId": "h8vgolhl3", "courtId": 1, "round": 7, "teamA": ["a5muzcw8q","4p4zbvg98"], "teamB": ["9xsgyve7f","d7xlrfvdn"], "type": "doubles", "scoreA": 2, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 16, "events": [], "highlights": [] },
          { "id": "c0qit24pa", "dayId": "h8vgolhl3", "courtId": 2, "round": 7, "teamA": ["awqcz4mq6","z64w1cs7r"], "teamB": ["uynls38wb","zqdlnv1uc"], "type": "doubles", "scoreA": 10, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 17, "events": [], "highlights": [] },
          { "id": "zazi2spqn", "dayId": "h8vgolhl3", "courtId": 1, "round": 8, "teamA": ["8aic760jt"], "teamB": ["754pc4n1w"], "type": "singles", "scoreA": 11, "scoreB": 5, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 18, "events": [], "highlights": [] },
          { "id": "bta7zpcev", "dayId": "h8vgolhl3", "courtId": 2, "round": 8, "teamA": ["d7xlrfvdn","awqcz4mq6"], "teamB": ["zqdlnv1uc","22rjubyro"], "type": "doubles", "scoreA": 11, "scoreB": 9, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 19, "events": [], "highlights": [] },
          { "id": "jrit7mn96", "dayId": "h8vgolhl3", "courtId": 3, "round": 8, "teamA": ["a5muzcw8q","fuowaw9d0"], "teamB": ["t1lvqmrot","z64w1cs7r"], "type": "doubles", "scoreA": 11, "scoreB": 4, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 20, "events": [], "highlights": [] }
        ],
        "attendees": ["oe3skdcma","uynls38wb","zqdlnv1uc","d7xlrfvdn","z64w1cs7r","8aic760jt","fuowaw9d0","22rjubyro","awqcz4mq6","a5muzcw8q","t1lvqmrot","754pc4n1w","4p4zbvg98","9xsgyve7f"],
        "partners": []
      },
      {
        "id": "qdps4gcoe",
        "week": 3,
        "day": 2,
        "date": 1773065284746,
        "status": "completed",
        "seed": 3201,
        "matches": [
          { "id": "ta54f87ak", "dayId": "qdps4gcoe", "courtId": 1, "round": 1, "teamA": ["oe3skdcma"], "teamB": ["a5muzcw8q"], "type": "singles", "scoreA": 11, "scoreB": 3, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 0, "events": [], "highlights": [] },
          { "id": "haqcgumk1", "dayId": "qdps4gcoe", "courtId": 2, "round": 1, "teamA": ["awqcz4mq6","22rjubyro"], "teamB": ["fuowaw9d0","uynls38wb"], "type": "doubles", "scoreA": 11, "scoreB": 7, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 1, "events": [], "highlights": [] },
          { "id": "vikt7xaho", "dayId": "qdps4gcoe", "courtId": 1, "round": 2, "teamA": ["22rjubyro"], "teamB": ["fuowaw9d0"], "type": "singles", "scoreA": 6, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 2, "events": [], "highlights": [] },
          { "id": "lysz65pv2", "dayId": "qdps4gcoe", "courtId": 1, "round": 3, "teamA": ["awqcz4mq6"], "teamB": ["uynls38wb"], "type": "singles", "scoreA": 11, "scoreB": 9, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 3, "events": [], "highlights": [] },
          { "id": "mpl62ntxq", "dayId": "qdps4gcoe", "courtId": 1, "round": 4, "teamA": ["fuowaw9d0","22rjubyro"], "teamB": ["oe3skdcma","a5muzcw8q"], "type": "doubles", "scoreA": 11, "scoreB": 8, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 4, "events": [], "highlights": [] },
          { "id": "crepv2vw9", "dayId": "qdps4gcoe", "courtId": 1, "round": 5, "teamA": ["fuowaw9d0","oe3skdcma"], "teamB": ["a5muzcw8q","awqcz4mq6"], "type": "doubles", "scoreA": 11, "scoreB": 7, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 5, "events": [], "highlights": [] },
          { "id": "u4ae74wl2", "dayId": "qdps4gcoe", "courtId": 1, "round": 6, "teamA": ["fuowaw9d0","a5muzcw8q"], "teamB": ["awqcz4mq6","uynls38wb"], "type": "doubles", "scoreA": 9, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 6, "events": [], "highlights": [] },
          { "id": "4ace6ltq1", "dayId": "qdps4gcoe", "courtId": 1, "round": 7, "teamA": ["a5muzcw8q","uynls38wb"], "teamB": ["fuowaw9d0","awqcz4mq6"], "type": "doubles", "scoreA": 11, "scoreB": 6, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 7, "events": [], "highlights": [] },
          { "id": "pv8j22r9h", "dayId": "qdps4gcoe", "courtId": 1, "round": 8, "teamA": ["a5muzcw8q","22rjubyro"], "teamB": ["awqcz4mq6","oe3skdcma"], "type": "doubles", "scoreA": 8, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 8, "events": [], "highlights": [] }
        ],
        "attendees": ["oe3skdcma","uynls38wb","awqcz4mq6","fuowaw9d0","22rjubyro","a5muzcw8q"],
        "partners": []
      },
      {
        "id": "qbeno1aqk",
        "week": 4,
        "day": 1,
        "date": 1773067192035,
        "status": "completed",
        "seed": 4101,
        "matches": [
          { "id": "4om2ktbre", "dayId": "qbeno1aqk", "courtId": 1, "round": 1, "teamA": ["bw0ed9my9"], "teamB": ["mrauy20h3"], "type": "singles", "scoreA": 5, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 0, "events": [], "highlights": [] },
          { "id": "9atbop1at", "dayId": "qbeno1aqk", "courtId": 2, "round": 1, "teamA": ["a5muzcw8q","754pc4n1w"], "teamB": ["z64w1cs7r","4p4zbvg98"], "type": "doubles", "scoreA": 1, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 1, "events": [], "highlights": [] },
          { "id": "k2j0bm4zf", "dayId": "qbeno1aqk", "courtId": 1, "round": 2, "teamA": ["d7xlrfvdn"], "teamB": ["awqcz4mq6"], "type": "singles", "scoreA": 4, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 2, "events": [], "highlights": [] },
          { "id": "wa0bgzjte", "dayId": "qbeno1aqk", "courtId": 2, "round": 2, "teamA": ["754pc4n1w","22rjubyro"], "teamB": ["4p4zbvg98","uynls38wb"], "type": "doubles", "scoreA": 10, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 3, "events": [], "highlights": [] },
          { "id": "q66vjrl66", "dayId": "qbeno1aqk", "courtId": 1, "round": 3, "teamA": ["oe3skdcma"], "teamB": ["22rjubyro"], "type": "singles", "scoreA": 11, "scoreB": 1, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 4, "events": [], "highlights": [] },
          { "id": "6bkyazhlk", "dayId": "qbeno1aqk", "courtId": 2, "round": 3, "teamA": ["4p4zbvg98","bw0ed9my9"], "teamB": ["z64w1cs7r","a5muzcw8q"], "type": "doubles", "scoreA": 11, "scoreB": 4, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 5, "events": [], "highlights": [] },
          { "id": "sq5m0vrdi", "dayId": "qbeno1aqk", "courtId": 1, "round": 4, "teamA": ["uynls38wb"], "teamB": ["754pc4n1w"], "type": "singles", "scoreA": 11, "scoreB": 1, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 6, "events": [], "highlights": [] },
          { "id": "easamb5pf", "dayId": "qbeno1aqk", "courtId": 2, "round": 4, "teamA": ["bw0ed9my9","mrauy20h3"], "teamB": ["a5muzcw8q","d7xlrfvdn"], "type": "doubles", "scoreA": 11, "scoreB": 4, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 7, "events": [], "highlights": [] },
          { "id": "geos99jrv", "dayId": "qbeno1aqk", "courtId": 1, "round": 5, "teamA": ["bw0ed9my9","awqcz4mq6"], "teamB": ["4p4zbvg98","mrauy20h3"], "type": "doubles", "scoreA": 4, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 8, "events": [], "highlights": [] },
          { "id": "bg9xdis4t", "dayId": "qbeno1aqk", "courtId": 2, "round": 5, "teamA": ["d7xlrfvdn","22rjubyro"], "teamB": ["z64w1cs7r","oe3skdcma"], "type": "doubles", "scoreA": 10, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 9, "events": [], "highlights": [] },
          { "id": "tjluaktki", "dayId": "qbeno1aqk", "courtId": 1, "round": 6, "teamA": ["z64w1cs7r","754pc4n1w"], "teamB": ["22rjubyro","awqcz4mq6"], "type": "doubles", "scoreA": 2, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 10, "events": [], "highlights": [] },
          { "id": "ytqw3nvrq", "dayId": "qbeno1aqk", "courtId": 2, "round": 6, "teamA": ["d7xlrfvdn","oe3skdcma"], "teamB": ["a5muzcw8q","uynls38wb"], "type": "doubles", "scoreA": 11, "scoreB": 3, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 11, "events": [], "highlights": [] },
          { "id": "kawr5jmen", "dayId": "qbeno1aqk", "courtId": 1, "round": 7, "teamA": ["4p4zbvg98"], "teamB": ["a5muzcw8q"], "type": "singles", "scoreA": 9, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 12, "events": [], "highlights": [] },
          { "id": "dotiy64gm", "dayId": "qbeno1aqk", "courtId": 2, "round": 7, "teamA": ["754pc4n1w","awqcz4mq6"], "teamB": ["bw0ed9my9","oe3skdcma"], "type": "doubles", "scoreA": 11, "scoreB": 7, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 13, "events": [], "highlights": [] },
          { "id": "moky9qzmq", "dayId": "qbeno1aqk", "courtId": 1, "round": 8, "teamA": ["754pc4n1w","bw0ed9my9"], "teamB": ["22rjubyro","mrauy20h3"], "type": "doubles", "scoreA": 1, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 14, "events": [], "highlights": [] },
          { "id": "n0tp57ola", "dayId": "qbeno1aqk", "courtId": 2, "round": 8, "teamA": ["oe3skdcma","d7xlrfvdn"], "teamB": ["z64w1cs7r","uynls38wb"], "type": "doubles", "scoreA": 11, "scoreB": 1, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 15, "events": [], "highlights": [] }
        ],
        "attendees": ["oe3skdcma","uynls38wb","mrauy20h3","d7xlrfvdn","z64w1cs7r","22rjubyro","awqcz4mq6","a5muzcw8q","754pc4n1w","bw0ed9my9","4p4zbvg98"],
        "partners": []
      },
      {
        "id": "pxiyhvbmk",
        "week": 4,
        "day": 2,
        "date": 1773845148550,
        "status": "completed",
        "seed": 4201,
        "matches": [
          { "id": "5gltfuiqh", "dayId": "pxiyhvbmk", "courtId": 1, "round": 1, "teamA": ["8aic760jt"], "teamB": ["fuowaw9d0"], "type": "singles", "scoreA": 5, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 0, "events": [], "highlights": [] },
          { "id": "dabxh1hta", "dayId": "pxiyhvbmk", "courtId": 2, "round": 1, "teamA": ["mrauy20h3","awqcz4mq6"], "teamB": ["22rjubyro","4p4zbvg98"], "type": "doubles", "scoreA": 11, "scoreB": 6, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 1, "events": [], "highlights": [] },
          { "id": "op0aipn8o", "dayId": "pxiyhvbmk", "courtId": 3, "round": 1, "teamA": ["oe3skdcma","754pc4n1w"], "teamB": ["uynls38wb","z64w1cs7r"], "type": "doubles", "scoreA": 11, "scoreB": 7, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 2, "events": [], "highlights": [] },
          { "id": "s8aeqkr78", "dayId": "pxiyhvbmk", "courtId": 1, "round": 2, "teamA": ["4p4zbvg98"], "teamB": ["754pc4n1w"], "type": "singles", "scoreA": 11, "scoreB": 4, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 3, "events": [], "highlights": [] },
          { "id": "dnu77q6n9", "dayId": "pxiyhvbmk", "courtId": 2, "round": 2, "teamA": ["oe3skdcma","22rjubyro"], "teamB": ["mrauy20h3","awqcz4mq6"], "type": "doubles", "scoreA": 11, "scoreB": 8, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 4, "events": [], "highlights": [] },
          { "id": "lujsndb3h", "dayId": "pxiyhvbmk", "courtId": 1, "round": 3, "teamA": ["z64w1cs7r"], "teamB": ["22rjubyro"], "type": "singles", "scoreA": 6, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 5, "events": [], "highlights": [] },
          { "id": "521anz1dk", "dayId": "pxiyhvbmk", "courtId": 2, "round": 3, "teamA": ["mrauy20h3","fuowaw9d0"], "teamB": ["awqcz4mq6","8aic760jt"], "type": "doubles", "scoreA": 11, "scoreB": 9, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 6, "events": [], "highlights": [] },
          { "id": "65w8n25wx", "dayId": "pxiyhvbmk", "courtId": 1, "round": 4, "teamA": ["oe3skdcma"], "teamB": ["awqcz4mq6"], "type": "singles", "scoreA": 11, "scoreB": 4, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 7, "events": [], "highlights": [] },
          { "id": "fozdb7qi2", "dayId": "pxiyhvbmk", "courtId": 2, "round": 4, "teamA": ["mrauy20h3","754pc4n1w"], "teamB": ["fuowaw9d0","4p4zbvg98"], "type": "doubles", "scoreA": 7, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 8, "events": [], "highlights": [] },
          { "id": "u5nnv7avv", "dayId": "pxiyhvbmk", "courtId": 1, "round": 5, "teamA": ["fuowaw9d0","8aic760jt"], "teamB": ["754pc4n1w","uynls38wb"], "type": "doubles", "scoreA": 11, "scoreB": 6, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 9, "events": [], "highlights": [] },
          { "id": "yx443428u", "dayId": "pxiyhvbmk", "courtId": 1, "round": 6, "teamA": ["fuowaw9d0","8aic760jt"], "teamB": ["oe3skdcma","4p4zbvg98"], "type": "doubles", "scoreA": 11, "scoreB": 8, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 10, "events": [], "highlights": [] },
          { "id": "jpxyw688y", "dayId": "pxiyhvbmk", "courtId": 2, "round": 6, "teamA": ["754pc4n1w","awqcz4mq6"], "teamB": ["mrauy20h3","22rjubyro"], "type": "doubles", "scoreA": 9, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 11, "events": [], "highlights": [] },
          { "id": "p6xrovdcm", "dayId": "pxiyhvbmk", "courtId": 1, "round": 7, "teamA": ["8aic760jt","4p4zbvg98"], "teamB": ["22rjubyro","z64w1cs7r"], "type": "doubles", "scoreA": 11, "scoreB": 5, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 12, "events": [], "highlights": [] },
          { "id": "w01by1n0o", "dayId": "pxiyhvbmk", "courtId": 2, "round": 7, "teamA": ["754pc4n1w","uynls38wb"], "teamB": ["awqcz4mq6","oe3skdcma"], "type": "doubles", "scoreA": 3, "scoreB": 11, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 13, "events": [], "highlights": [] },
          { "id": "j92u550f8", "dayId": "pxiyhvbmk", "courtId": 1, "round": 8, "teamA": ["mrauy20h3"], "teamB": ["uynls38wb"], "type": "singles", "scoreA": 11, "scoreB": 0, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 14, "events": [], "highlights": [] },
          { "id": "swfh2t81p", "dayId": "pxiyhvbmk", "courtId": 2, "round": 8, "teamA": ["4p4zbvg98","awqcz4mq6"], "teamB": ["fuowaw9d0","z64w1cs7r"], "type": "doubles", "scoreA": 11, "scoreB": 7, "isCompleted": true, "status": "completed", "noShowPlayerIds": [], "orderIndex": 15, "events": [], "highlights": [] }
        ],
        "attendees": ["oe3skdcma","uynls38wb","mrauy20h3","z64w1cs7r","8aic760jt","awqcz4mq6","fuowaw9d0","22rjubyro","754pc4n1w","4p4zbvg98"],
        "partners": []
      }
    ],
    "players": ["oe3skdcma","awqcz4mq6","fuowaw9d0","d7xlrfvdn","mrauy20h3","4p4zbvg98","uynls38wb","22rjubyro","8aic760jt","z64w1cs7r"],
    "finalStandings": [
      { "playerId": "oe3skdcma", "points": 88.4, "wins": 24, "losses": 10, "gamesPlayed": 34, "ppg": 2.60, "bonusPoints": 3, "noShows": 1, "eligibleForTrophies": true },
      { "playerId": "awqcz4mq6", "points": 68.0, "wins": 17, "losses": 10, "gamesPlayed": 27, "ppg": 2.52, "bonusPoints": 1, "noShows": 0, "eligibleForTrophies": true },
      { "playerId": "fuowaw9d0", "points": 67.2, "wins": 16, "losses": 11, "gamesPlayed": 27, "ppg": 2.49, "bonusPoints": 3, "noShows": 0, "eligibleForTrophies": true },
      { "playerId": "d7xlrfvdn", "points": 64.8, "wins": 17, "losses": 10, "gamesPlayed": 27, "ppg": 2.40, "bonusPoints": 2, "noShows": 3, "eligibleForTrophies": true },
      { "playerId": "mrauy20h3", "points": 59.8, "wins": 16, "losses": 10, "gamesPlayed": 26, "ppg": 2.30, "bonusPoints": 2, "noShows": 1, "eligibleForTrophies": true },
      { "playerId": "4p4zbvg98", "points": 33.8, "wins": 10, "losses": 3, "gamesPlayed": 13, "ppg": 2.60, "bonusPoints": 1, "noShows": 1, "eligibleForTrophies": false },
      { "playerId": "uynls38wb", "points": 90.3, "wins": 24, "losses": 19, "gamesPlayed": 43, "ppg": 2.10, "bonusPoints": 6, "noShows": 0, "eligibleForTrophies": true },
      { "playerId": "22rjubyro", "points": 56.0, "wins": 12, "losses": 16, "gamesPlayed": 28, "ppg": 2.00, "bonusPoints": 1, "noShows": 0, "eligibleForTrophies": true },
      { "playerId": "8aic760jt", "points": 50.6, "wins": 11, "losses": 21, "gamesPlayed": 32, "ppg": 1.58, "bonusPoints": 8, "noShows": 0, "eligibleForTrophies": true },
      { "playerId": "z64w1cs7r", "points": 60.8, "wins": 10, "losses": 30, "gamesPlayed": 40, "ppg": 1.52, "bonusPoints": 5, "noShows": 2, "eligibleForTrophies": true }
    ],
    "endedAt": 1774428413878
  },
  "activeSession": null,
  "activeTournament": null,
  "activeGames": [],
  "pastLeagues": [],
  "pastTournaments": [],
  "queue": [],
  "autoSync": true,
  "seasonHistory": [
    { "seasonNumber": 0, "seasonName": "The Genesis", "winnerId": "oe3skdcma", "wins": 12 }
  ],
  "trophyHolderId": "oe3skdcma"
};
