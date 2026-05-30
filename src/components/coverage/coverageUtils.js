/** @param {Array} hubs */
export function hubsByZoneId(hubs) {
  const map = new Map();
  for (const h of hubs || []) {
    if (h?.zoneId == null) continue;
    const id = Number(h.zoneId);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(h);
  }
  return map;
}

export function zoneHubStats(zone, hubMap) {
  const list = hubMap.get(Number(zone?.id)) || [];
  const activeHubs = list.filter((h) => Boolean(h.isActive));
  return {
    total: list.length,
    active: activeHubs.length,
    inactive: list.length - activeHubs.length,
  };
}

export function zoneBookingLabel(zoneActive) {
  return zoneActive
    ? { short: "Serving", long: "In-city + outstation via this zone" }
    : { short: "Paused", long: "Local bookings off in this area" };
}

export function hubRoleLabel(hubActive, zoneActive, hasZone = true) {
  if (!hubActive) {
    return { short: "Hub off", detail: "Not used in quotes" };
  }
  if (!hasZone) {
    return { short: "No zone linked", detail: "Select a zone — required for quotes" };
  }
  if (!zoneActive) {
    return {
      short: "Cross-city only",
      detail: "Hub works for outstation; zone paused for local trips",
    };
  }
  return { short: "Operational", detail: "Used for in-city and outstation" };
}
