export function createPlateSystem(definitions = [], { events } = {}) {
  const plates = definitions.map((plate) => ({ halfX: 0.8, halfZ: 0.8, active: false, occupants: [], ...plate }));

  return {
    plates,
    update(actors = []) {
      const changed = [];
      for (const plate of plates) {
        const previous = plate.active;
        plate.occupants = actors.filter((actor) => actor.active !== false &&
          Math.abs(actor.position.x - plate.x) <= plate.halfX &&
          Math.abs(actor.position.z - plate.z) <= plate.halfZ).map((actor) => actor.id);
        plate.active = plate.occupants.length > 0;
        if (plate.active !== previous) {
          changed.push(plate.id);
          events?.emit('plate:change', { id: plate.id, active: plate.active, occupants: [...plate.occupants] });
        }
      }
      return changed;
    },
    allActive(ids = plates.map((plate) => plate.id)) {
      return ids.every((id) => plates.find((plate) => plate.id === id)?.active);
    },
    reset() {
      for (const plate of plates) {
        plate.active = false;
        plate.occupants = [];
      }
    }
  };
}
