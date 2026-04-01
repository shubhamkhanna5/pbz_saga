
export const MATCH_CONFIG = {
  COURTS: 2,
  MATCH_DURATION_MIN: 15,
  TOTAL_TIME_MIN: 120,

  get STAGES() {
    return Math.floor(this.TOTAL_TIME_MIN / this.MATCH_DURATION_MIN); // 8
  },

  get MATCHES_PER_DAY() {
    return this.STAGES * this.COURTS; // 16
  },

  get SESSIONS_PER_HOUR() {
    return 60 / this.MATCH_DURATION_MIN; // 4
  }
};
