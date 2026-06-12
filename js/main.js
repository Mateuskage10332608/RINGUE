// ============================================================
//  main.js  –  Entry Point
// ============================================================

window.gameState = null;
window.ui        = null;

document.addEventListener('DOMContentLoaded', () => {
  gameState        = new GameState();
  window.gameState = gameState;
  ui               = new UI(gameState);

  ui.show('mainMenu');
});

// ── Global keyboard shortcuts ─────────────────────────────
document.addEventListener('keydown', (e) => {
  if (!ui) return;
  if (e.key === 'Escape') {
    if (ui.currentScreen === 'academyHub') return;
    if (['academyRoster','academyRecruitment','academyFighter'].includes(ui.currentScreen)) {
      ui.show('academyHub');
      return;
    }
    if (ui.currentScreen === 'careerHub') return;
    if (['training','fightSelect','preFight','rankings','fightHistory','analystShow','team','contracts','challenges'].includes(ui.currentScreen)) {
      ui.show('careerHub');
    }
  }
});
