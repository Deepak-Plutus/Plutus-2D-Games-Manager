import * as PIXI from "pixi.js";
import { System } from "../Core/System";
import type { World } from "../Core/World";
import { TextUiComponent } from "../Components/ui/TextUiComponent";
import { ButtonUiComponent } from "../Components/ui/ButtonUiComponent";
import { ProgressBarUiComponent } from "../Components/ui/ProgressBarUiComponent";
import { SliderUiComponent } from "../Components/ui/SliderUiComponent";
import { CheckboxUiComponent } from "../Components/ui/CheckboxUiComponent";
import { InputFieldUiComponent } from "../Components/ui/InputFieldUiComponent";
import { ClickableComponent } from "../Components/ui/ClickableComponent";
import { DraggableComponent } from "../Components/ui/DraggableComponent";
import { ButtonEntity } from "../Entities/ButtonEntity";

export type UiState = {
  values: Record<string, unknown>;
};

export const RES_UI = "ui";

export class UiSystem extends System {
  get singletonKey(): string {
    return "UiSystem";
  }

  update(_dt: number, world: World): void {
    let ui = world.getResource<UiState>(RES_UI);
    if (!ui) {
      ui = { values: {} };
      world.setResource(RES_UI, ui);
    }

    // Text + Label (both use PIXI.Text view)
    for (const [entity, textUi] of world.query(TextUiComponent)) {
      const view = entity.view;
      const text = view instanceof PIXI.Text ? view : view.children.find((c) => c instanceof PIXI.Text);
      if (!(text instanceof PIXI.Text)) continue;

      if (textUi.style) text.style = new PIXI.TextStyle({ ...(text.style as any), ...textUi.style });

      const bound = textUi.key ? ui.values[textUi.key] : undefined;
      const rendered = bound !== undefined ? String(bound) : textUi.text;
      text.text = `${textUi.prefix}${rendered}${textUi.suffix}`;
    }

    // Progress bar visuals
    for (const [entity, bar] of world.query(ProgressBarUiComponent)) {
      const c = entity.view;
      if (!(c instanceof PIXI.Container)) continue;
      const bg = c.getChildByName("bg");
      const fill = c.getChildByName("fill");
      const label = c.getChildByName("label");
      if (!(bg instanceof PIXI.Graphics) || !(fill instanceof PIXI.Graphics)) continue;

      const w = (bg as any).__w as number | undefined;
      const h = (bg as any).__h as number | undefined;
      if (!w || !h) continue;

      const raw = ui.values[bar.key];
      // drive bar value from UI state when available
      const stateV = typeof raw === "number" ? raw : undefined;
      if (typeof stateV === "number") bar.value = stateV;

      // animate component value when requested
      if (
        typeof bar._animFrom === "number" &&
        typeof bar._animTo === "number" &&
        typeof bar._animDurationMs === "number" &&
        typeof bar._animElapsedMs === "number"
      ) {
        bar._animElapsedMs += Math.max(0, _dt);
        const tAnim = clamp01(bar._animElapsedMs / Math.max(1e-9, bar._animDurationMs));
        bar.value = bar._animFrom + (bar._animTo - bar._animFrom) * tAnim;
        if (tAnim >= 1) {
          bar._animFrom = undefined;
          bar._animTo = undefined;
          bar._animDurationMs = undefined;
          bar._animElapsedMs = undefined;
        }
        ui.values[bar.key] = bar.value;
      }

      const v = bar.value;
      const t = clamp01((v - bar.min) / Math.max(1e-9, bar.max - bar.min));
      (fill as any).__t = t;

      const r = (bg as any).__radius as number | undefined;
      const radius = typeof r === "number" ? r : 8;

      fill.clear();
      fill.roundRect(0, 0, w * t, h, radius);
      fill.fill({ color: (fill as any).__fillColor ?? 0x22c55e, alpha: 1 });

      if (label instanceof PIXI.Text && bar.showText) {
        const d = Math.max(0, bar.decimals);
        label.text = `${v.toFixed(d)}/${bar.max.toFixed(d)}`;
      }
    }

    // Button attach + update visuals
    for (const [entity, btn] of world.query(ButtonUiComponent)) {
      const v = entity.view;
      const buttonEntity = entity instanceof ButtonEntity ? entity : undefined;
      const container =
        buttonEntity?.container ??
        (v instanceof PIXI.Container ? v : undefined);
      if (!container) continue;

      // Update label text if possible
      const text = buttonEntity?.text ?? container.children.find((c) => c instanceof PIXI.Text);
      if (text instanceof PIXI.Text) text.text = btn.label;

      // Enable/disable interactivity
      container.eventMode = btn.enabled ? "static" : "none";
      container.cursor = btn.enabled ? "pointer" : "default";
      container.alpha = btn.enabled ? 1 : 0.6;

      if (!btn._attached) {
        btn._attached = true;
        container.on("pointertap", () => {
          if (!btn.enabled) return;
          btn.emitClick();
          if (btn.key) {
            const prev = ui.values[btn.key];
            ui.values[btn.key] = typeof prev === "number" ? (prev as number) + 1 : 1;
          }
        });
      }
    }

    // Slider attach + update visuals
    for (const [entity, slider] of world.query(SliderUiComponent)) {
      const c = entity.view;
      if (!(c instanceof PIXI.Container)) continue;
      const track = c.getChildByName("track");
      const thumb = c.getChildByName("thumb");
      if (!(track instanceof PIXI.Graphics) || !(thumb instanceof PIXI.Graphics)) continue;

      const w = (track as any).__w as number | undefined;
      if (!w) continue;

      if (!slider._attached) {
        slider._attached = true;
        c.eventMode = "static";
        c.cursor = "pointer";

        const startDrag = (e: PIXI.FederatedPointerEvent) => {
          slider._dragging = true;
          this.setSliderFromPointer(world, slider, track, e.global);
        };
        const endDrag = () => {
          slider._dragging = false;
        };
        const moveDrag = (e: PIXI.FederatedPointerEvent) => {
          if (!slider._dragging) return;
          this.setSliderFromPointer(world, slider, track, e.global);
        };

        c.on("pointerdown", startDrag);
        c.on("pointerup", endDrag);
        c.on("pointerupoutside", endDrag);
        c.on("pointermove", moveDrag);
      }

      // keep local slider value in sync with ui
      const raw = ui.values[slider.key];
      if (typeof raw === "number") slider.value = raw;
      else ui.values[slider.key] = slider.value;

      const t = clamp01((slider.value - slider.min) / Math.max(1e-9, slider.max - slider.min));
      thumb.x = -w / 2 + w * t;
    }

    // Checkbox attach + update visuals
    for (const [entity, cb] of world.query(CheckboxUiComponent)) {
      const c = entity.view;
      if (!(c instanceof PIXI.Container)) continue;
      const check = c.getChildByName("check");
      if (!(check instanceof PIXI.Graphics)) continue;

      if (!cb._attached) {
        cb._attached = true;
        c.eventMode = "static";
        c.cursor = "pointer";
        c.on("pointertap", () => {
          cb.toggle();
          ui.values[cb.key] = cb.checked;
          cb.emitChange();
        });
      }

      const raw = ui.values[cb.key];
      if (typeof raw === "boolean") cb.checked = raw;
      else ui.values[cb.key] = cb.checked;

      check.visible = cb.checked;
    }

    // InputField (prompt-based) attach + update visuals
    for (const [entity, input] of world.query(InputFieldUiComponent)) {
      const c = entity.view;
      if (!(c instanceof PIXI.Container)) continue;
      const text = c.getChildByName("text");
      if (!(text instanceof PIXI.Text)) continue;

      if (!input._attached) {
        input._attached = true;
        c.eventMode = "static";
        c.cursor = "text";
        c.on("pointertap", () => {
          const current = typeof ui.values[input.key] === "string" ? (ui.values[input.key] as string) : input.value;
          const next = window.prompt(input.placeholder || input.key, current);
          if (next === null) return;
          input.setValue(next);
          ui.values[input.key] = input.value;
          input.emitSubmit();
        });
      }

      const raw = ui.values[input.key];
      if (typeof raw === "string") input.value = raw;
      else ui.values[input.key] = input.value;

      text.text = input.value.length ? input.value : input.placeholder;
      text.alpha = input.value.length ? 1 : 0.6;
    }

    // Generic clickable interactions
    for (const [entity, clickable] of world.query(ClickableComponent)) {
      const view = entity.view;
      if (!view) continue;
      if (!clickable._attached) {
        clickable._attached = true;
        view.eventMode = "static";
        view.cursor = "pointer";
        view.on("pointertap", () => clickable.emitClick());
        view.on("pointerover", () => clickable.emitHover(true));
        view.on("pointerout", () => clickable.emitHover(false));
        view.on("pointerdown", () => clickable.emitPress(true));
        view.on("pointerup", () => clickable.emitPress(false));
        view.on("pointerupoutside", () => clickable.emitPress(false));
      }
    }

    // Generic draggable interactions
    for (const [entity, drag] of world.query(DraggableComponent)) {
      const view = entity.view;
      if (!view) continue;
      if (!drag._attached) {
        drag._attached = true;
        view.eventMode = "static";
        view.cursor = "grab";

        view.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
          drag.startDrag();
          view.cursor = "grabbing";
          const local = view.parent ? view.parent.toLocal(e.global) : e.global;
          drag._pointerOffset = { x: local.x - view.position.x, y: local.y - view.position.y };
        });
        view.on("pointerup", () => {
          drag.endDrag();
          view.cursor = "grab";
        });
        view.on("pointerupoutside", () => {
          drag.endDrag();
          view.cursor = "grab";
        });
        view.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
          if (!drag._dragging) return;
          const local = view.parent ? view.parent.toLocal(e.global) : e.global;
          const pos = { x: local.x - drag._pointerOffset.x, y: local.y - drag._pointerOffset.y };
          drag.dragTo(pos);
          view.position.set(pos.x, pos.y);
        });
      }
    }
  }

  private setSliderFromPointer(world: World, slider: SliderUiComponent, track: PIXI.Graphics, global: PIXI.PointData): void {
    const ui = world.getResource<UiState>(RES_UI);
    if (!ui) return;

    const w = (track as any).__w as number | undefined;
    if (!w) return;

    const local = track.toLocal(global);
    const x = clamp(local.x, -w / 2, w / 2);
    const t = (x + w / 2) / w;
    let v = slider.min + t * (slider.max - slider.min);
    if (slider.step > 0) v = Math.round(v / slider.step) * slider.step;
    v = clamp(v, slider.min, slider.max);
    const changed = v !== slider.value;
    slider.value = v;
    ui.values[slider.key] = v;
    if (changed) slider.emitChange();
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

