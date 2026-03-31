import { GameManager } from './Core/GameManager.js';

const root = document.getElementById('app');
if (root) {
  const game = new GameManager(root);
  game.start().catch((err) => {
    console.error(err);
  });
}
