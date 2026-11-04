// 按路点散步；交谈时不移动，保持原来的路线进度。
export function updateNpcWalk(npc, dt, paused) {
  if (!npc.walkRoute) return;
  let moving = !paused;
  if (moving) {
    const target = npc.walkRoute[npc.walkIndex || 0];
    const dx = target[0] - npc.body.position.x, dz = target[1] - npc.body.position.z;
    const distance = Math.hypot(dx, dz), travel = Math.min(distance, .8 * dt);
    if (distance > .01) {
      npc.body.position.x += dx / distance * travel;
      npc.body.position.z += dz / distance * travel;
      const angle = Math.atan2(-dx, -dz) + (npc.facingOffset || 0);
      npc.body.rotation.y += Math.atan2(Math.sin(angle - npc.body.rotation.y), Math.cos(angle - npc.body.rotation.y)) * (1 - Math.exp(-dt * 7));
    }
    if (distance <= travel + .01) npc.walkIndex = ((npc.walkIndex || 0) + 1) % npc.walkRoute.length;
  }
  const actions = npc.person.actions;
  const amount = actions.walk.getEffectiveWeight() + ((moving ? 1 : 0) - actions.walk.getEffectiveWeight()) * (1 - Math.exp(-dt * 10));
  actions.walk.setEffectiveWeight(amount);
  actions.idle.setEffectiveWeight(1 - amount);
}
