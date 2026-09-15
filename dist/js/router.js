import { buildingById } from "./campus-data.js?v=90926fb31109";
import { getNavigationGraph } from "./navigation-graph.js?v=90926fb31109";
import { findShortestPath } from "./shortest-path.js?v=90926fb31109";
import { createRouteStages } from "./route-stages.js?v=90926fb31109";
export { getNavigationGraph } from "./navigation-graph.js?v=90926fb31109";

const roomId=location=>location.graphNode??`${location.buildingId}:${location.floor}:${location.id}`;

/** UI-independent routing facade. Inject a graph to test or load another campus. */
export function buildRoute(origin,destination,{graph=getNavigationGraph()}={}){
  const empty={points:null,stages:[]};
  if(!origin||!destination)return {...empty,status:"empty",steps:[]};
  if(origin.id===destination.id)return {...empty,status:"same",steps:["Вы уже находитесь в выбранной точке."],estimatedSeconds:0,estimatedMinutes:0};
  if(!origin.verified||!destination.verified)return {...empty,status:"unverified",steps:["Для одной из выбранных точек положение на плане пока не подтверждено."]};
  const start=roomId(origin),end=roomId(destination);
  const path=findShortestPath(graph,start,end,{allowEdge:edge=>!edge.closed&&(!graph.nodes.get(edge.to).terminalOnly||edge.to===start||edge.to===end)});
  if(!path)return {...empty,status:"unavailable",steps:["Для этих точек пока нет проверенного пути на схеме."]};
  const stages=createRouteStages(path,origin,destination,{nodes:graph.nodes,buildingById});
  return {status:"ready",kind:stages.some(s=>s.kind==="outdoor")?"outdoor":origin.buildingId!==destination.buildingId?"cross-building":origin.floor!==destination.floor?"cross-floor":"same-floor",cost:path.cost,estimatedSeconds:path.cost,points:null,estimatedMinutes:Math.max(1,Math.ceil(path.cost/60)),timingBasis:"mixed",profileRevision:graph.profileRevision,stages,steps:stages.map(s=>s.summary+". "+s.detail)};
}
