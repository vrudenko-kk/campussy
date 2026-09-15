import { findShortestPath } from "./shortest-path.js?v=90926fb31109";

// User measurement, 2026-09-15. The nearest corpus-1 staircase is the west one.
export const walkingMeasurements=[{
  from:"entry:1:main-entrance",to:"c1:1:c1-1-stairs-w",seconds:30,
  areas:["entry","c1"],floor:1,
}];

/** Distribute a measured walk across its existing geometry, never add shortcuts.
 * Only the measured direction is calibrated; the return remains an estimate.
 */
export function calibrateWalkingEdges(graph,measurements){
  for(const measurement of measurements){
    if(!Number.isFinite(measurement.seconds)||measurement.seconds<=0)throw new Error("Invalid walk measurement");
    const path=findShortestPath(graph,measurement.from,measurement.to,{allowEdge:edge=>{
      const a=graph.nodes.get(edge.from),b=graph.nodes.get(edge.to);
      return ["floor","transition"].includes(edge.kind)&&measurement.areas.includes(a.buildingId)&&measurement.areas.includes(b.buildingId)&&a.floor===measurement.floor&&b.floor===measurement.floor&&!b.terminalOnly;
    }});
    if(!path||path.cost<=0)throw new Error("Measurement does not match a walkable path");
    for(const edge of path.edges){
      const seconds=edge.cost/path.cost*measurement.seconds;
      graph.edges.set(edge.from,graph.edges.get(edge.from).map(candidate=>candidate===edge?Object.freeze({...edge,cost:seconds,seconds,basis:"calibrated",measurement:`${measurement.from} → ${measurement.to}`}):candidate));
    }
  }
}
