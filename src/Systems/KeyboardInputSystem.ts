import { System } from '../Core/System';
import type { World } from '../Core/World';
import { KeyboardControllerComponent } from '../Components/KeyboardControllerComponent';
import { VelocityComponent } from '../Components/VelocityComponent';
import type { InputState } from './InputSystem';
import { RES_INPUT } from './InputSystem';

function axis(neg: boolean, pos: boolean): number {
  return (pos ? 1 : 0) - (neg ? 1 : 0);
}

/**
 * KeyboardInputSystem
 * Converts raw keyboard input into control values (currently: entity Velocity).
 * MovementSystem then applies Velocity to Transform.
 */
export class KeyboardInputSystem extends System {
  update(_dt: number, world: World): void {
    // When paused, don't update control outputs
    const state = world.getResource<{ current?: string }>('state');
    if (state?.current === 'paused') return;

    const input = world.getResource<InputState>(RES_INPUT);
    if (!input) return;

    for (const [, controller, vel] of world.query(KeyboardControllerComponent, VelocityComponent)) {
      const left = input.keysDown.has('ArrowLeft') || input.keysDown.has('KeyA');
      const right = input.keysDown.has('ArrowRight') || input.keysDown.has('KeyD');
      const up = input.keysDown.has('ArrowUp') || input.keysDown.has('KeyW');
      const down = input.keysDown.has('ArrowDown') || input.keysDown.has('KeyS');

      const x = axis(left, right);
      const y = axis(up, down);

      const len = Math.hypot(x, y);
      const nx = len > 0 ? x / len : 0;
      const ny = len > 0 ? y / len : 0;

      vel.x = nx * controller.speed;
      vel.y = ny * controller.speed;
    }
  }
}

