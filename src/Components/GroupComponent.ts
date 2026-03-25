export type GroupComponentProps = {
  /**
   * Group key used as the dictionary key in `groups` state.
   * Defaults to entity name.
   */
  key?: string;
  /**
   * If set, all entities with this tag become members.
   */
  tag?: string;
  /**
   * If set, these entity names become members.
   */
  members?: string[];
};

export class GroupComponent {
  static readonly type = "Group";
  readonly type = GroupComponent.type;

  key?: string;
  tag?: string;
  members?: string[];

  constructor(props: GroupComponentProps = {}) {
    this.key = typeof props.key === "string" ? props.key : undefined;
    this.tag = typeof props.tag === "string" ? props.tag : undefined;
    this.members = Array.isArray(props.members) ? props.members.filter((x) => typeof x === "string") : undefined;
  }

  add(entity: string): void {
    if (!entity) return;
    const next = new Set(this.members ?? []);
    next.add(entity);
    this.members = [...next];
  }

  remove(entity: string): void {
    if (!entity || !this.members?.length) return;
    this.members = this.members.filter((m) => m !== entity);
  }

  forEach(callback: (entity: string) => void): void {
    if (typeof callback !== "function") return;
    for (const m of this.members ?? []) callback(m);
  }

  has(entity: string): boolean {
    if (!entity) return false;
    return (this.members ?? []).includes(entity);
  }

  clear(): void {
    this.members = [];
  }

  size(): number {
    return this.members?.length ?? 0;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  getMembers(): string[] {
    return [...(this.members ?? [])];
  }
}

