// ModelDef: a named tree of voxel parts that a rig can pose.
//
//   part.origin : where this part's pivot sits, in the PARENT part's local space (world units, relative to the parent's pivot)
//   part.pivot  : the pivot point inside this part's own voxel grid (voxel coords). The part rotates about it.
//   part.grid   : VoxelGrid
//   attach      : named points {name: {part, at:[x,y,z]}} in voxel coords of a part (hand grip, saddle, muzzle, head top ...)
//
// Everything that renders in the game (soldiers, horses, catapults, props with moving parts) is a ModelDef.

export class ModelDef {
  constructor(id, voxelSize = 0.1) {
    this.id = id;
    this.voxelSize = voxelSize;
    this.parts = [];
    this.byId = Object.create(null);
    this.attach = Object.create(null);
    this.meta = {};
  }
  /**
   * @param {string} id
   * @param {import('./grid.js').VoxelGrid} grid
   * @param {{parent?:string|null, origin?:number[], pivot?:number[], shadow?:boolean}} o
   *   origin is in VOXELS (converted to world units here) relative to the parent's pivot, so builders can think in voxels only.
   */
  addPart(id, grid, o = {}) {
    const s = this.voxelSize;
    const parent = o.parent ?? null;
    const part = {
      id, grid,
      parent,
      parentIndex: parent ? this.byId[parent].index : -1,
      origin: (o.origin || [0, 0, 0]).map((v) => v * s),
      originVox: (o.origin || [0, 0, 0]).slice(),
      pivot: (o.pivot || [grid.sx / 2, 0, grid.sz / 2]).slice(),
      shadow: o.shadow !== false,
      index: this.parts.length,
    };
    if (parent && !this.byId[parent]) throw new Error(`ModelDef ${this.id}: unknown parent ${parent} for ${id}`);
    this.parts.push(part);
    this.byId[id] = part;
    return part;
  }
  /** Register a named attach point on a part (voxel coords inside that part's grid). */
  addAttach(name, partId, at) { this.attach[name] = { part: partId, at: at.slice() }; return this; }
  partIndex(id) { const p = this.byId[id]; return p ? p.index : -1; }
  /** Approximate world-space height of the model (units), used for health bars and camera follow. */
  height() {
    let top = 0;
    for (const p of this.parts) {
      const b = p.grid.bounds(); if (!b) continue;
      // accumulate origins down to the root (ignores rotation: rest pose)
      let y = (b.y1 + 1 - p.pivot[1]) * this.voxelSize, q = p;
      while (q) { y += q.origin[1]; q = q.parent ? this.byId[q.parent] : null; }
      if (y > top) top = y;
    }
    return top;
  }
  voxelCount() { let n = 0; for (const p of this.parts) n += p.grid.count(); return n; }
}
