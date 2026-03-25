export type TagComponentProps = {
  tags?: string[];
};

/**
 * TagComponent
 * - JSON-driven tags attached to an entity.
 * - Designed to complement (and not replace) EntitiesManagementSystem tag storage.
 *
 * Note: systems should use TagComponent when they need ECS-consistent tags.
 */
export class TagComponent {
  static readonly type = "Tag";
  readonly type = TagComponent.type;

  private _tags = new Set<string>();

  constructor(props: TagComponentProps = {}) {
    const tags = Array.isArray(props.tags) ? props.tags.filter((t) => typeof t === "string" && t.length > 0) : [];
    for (const t of tags) this._tags.add(t);
  }

  addTag(tag: string): void {
    if (typeof tag !== "string" || tag.length === 0) return;
    this._tags.add(tag);
  }

  removeTag(tag: string): void {
    this._tags.delete(tag);
  }

  hasTag(tag: string): boolean {
    return this._tags.has(tag);
  }

  /**
   * Useful for debugging/inspection.
   * Keep it deterministic (stable order).
   */
  get tags(): string[] {
    return [...this._tags].sort();
  }
}

