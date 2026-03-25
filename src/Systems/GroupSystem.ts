import * as PIXI from "pixi.js";
import { System } from "../Core/System";
import type { World } from "../Core/World";
import type { EntitiesResource } from "./EntitiesManagementSystem";
import { RES_ENTITIES } from "./EntitiesManagementSystem";
import { GroupComponent } from "../Components/GroupComponent";
import type { EntityBase } from "../Entities/EntityBase";
import { TransformComponent } from "../Components/TransformComponent";

export const RES_GROUPS = "groups";
export const RES_GROUPS_API = "groups_api";

export type GroupsState = {
  groups: Record<string, number[]>;
};

export type GroupsApi = {
  getMemberIds: (groupKey: string) => number[];
  getMembers: (groupKey: string) => EntityBase[];
  hasMember: (groupKey: string, entityId: number) => boolean;
};

export class GroupSystem extends System {
  get singletonKey(): string {
    return "GroupSystem";
  }

  update(_dt: number, world: World): void {
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    if (!entities) return;

    if (!world.getResource<GroupsState>(RES_GROUPS)) {
      world.setResource<GroupsState>(RES_GROUPS, { groups: {} });
    }

    if (!world.getResource<GroupsApi>(RES_GROUPS_API)) {
      const api: GroupsApi = {
        getMemberIds: (groupKey) => world.getResource<GroupsState>(RES_GROUPS)?.groups[groupKey] ?? [],
        getMembers: (groupKey) => {
          const ids = api.getMemberIds(groupKey);
          return ids.map((id) => world.getEntity(id)).filter(Boolean) as EntityBase[];
        },
        hasMember: (groupKey, entityId) => api.getMemberIds(groupKey).includes(entityId),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      world.setResource<GroupsApi>(RES_GROUPS_API, api as any);
    }

    const state = world.getResource<GroupsState>(RES_GROUPS);
    if (!state) return;

    for (const [entity, group] of world.query(GroupComponent)) {
      const key = group.key ?? entity.name;
      const members = new Set<number>();

      if (group.tag) {
        for (const m of entities.entitiesWithTag(group.tag)) members.add(m.id);
      }
      if (group.members?.length) {
        for (const name of group.members) {
          const m = entities.findByName(name);
          if (m) members.add(m.id);
        }
      }

      state.groups[key] = [...members];

      // Visual grouping: re-parent member display objects under the group's container.
      // We also update the member TransformComponent to the new local coords so PixiSyncSystem
      // doesn't snap them back next frame.
      const groupView = entity.view;
      for (const memberId of state.groups[key]) {
        const member = world.getEntity(memberId);
        if (!member) continue;
        if (member.view.parent === groupView) continue;

        const global = member.view.toGlobal(new PIXI.Point(0, 0));
        const local = groupView.toLocal(global);

        const t = world.getComponent(member, TransformComponent);
        if (t) {
          t.position.x = local.x;
          t.position.y = local.y;
        } else {
          member.view.position.set(local.x, local.y);
        }

        groupView.addChild(member.view);
      }
    }
  }
}

