import { buildingById, buildings, transitions } from "./campus-data.js";

const detailedCorridor = [[550,555],[760,555],[1030,555],[1280,555],[1470,545]];
const nodeKey = (buildingId,floor) => `${buildingId}:${floor}`;
const nodeFromKey = key => { const [buildingId,floor]=key.split(":"); return {buildingId,floor:Number(floor)}; };

function nearestIndex(point,nodes=detailedCorridor) {
  return nodes.reduce((best,node,index) => Math.abs(node[0]-point[0]) < Math.abs(nodes[best][0]-point[0]) ? index : best,0);
}

function sameFloorPoints(origin,destination) {
  if (!origin.point || !origin.door || !destination.point || !destination.door) return null;
  const fromIndex=nearestIndex(origin.door); const toIndex=nearestIndex(destination.door);
  const direction=fromIndex<=toIndex?1:-1; const points=[origin.point,origin.door];
  for (let index=fromIndex;;index+=direction) { points.push(detailedCorridor[index]); if (index===toIndex) break; }
  points.push(destination.door,destination.point); return points;
}

function sameFloorInstructions(origin,destination) {
  const direction=destination.door?.[0]>origin.door?.[0]?"направо":destination.door?.[0]<origin.door?.[0]?"налево":"прямо";
  return [`Выйдите из точки «${origin.name}» в основной коридор.`,`Двигайтесь по коридору ${direction}.`,`Следуйте до указателя «${destination.name}».`];
}

function addEdge(graph,from,to,cost,details) {
  if (!graph.has(from)) graph.set(from,[]);
  graph.get(from).push({from,to,cost,...details});
}

function buildCampusGraph() {
  const graph=new Map();
  buildings.forEach(building=>{
    building.floors.forEach(floor=>{ if (!graph.has(nodeKey(building.id,floor))) graph.set(nodeKey(building.id,floor),[]); });
    for (let index=0;index<building.floors.length-1;index+=1) {
      const a=nodeKey(building.id,building.floors[index]); const b=nodeKey(building.id,building.floors[index+1]);
      addEdge(graph,a,b,10,{kind:"vertical"}); addEdge(graph,b,a,10,{kind:"vertical"});
    }
  });
  transitions.forEach(transition=>{
    const a=nodeKey(transition.from.buildingId,transition.from.floor); const b=nodeKey(transition.to.buildingId,transition.to.floor);
    addEdge(graph,a,b,transition.cost,{kind:"transition",transition});
    addEdge(graph,b,a,transition.cost,{kind:"transition",transition});
  });
  return graph;
}

function shortestPath(origin,destination) {
  const graph=buildCampusGraph(); const start=nodeKey(origin.buildingId,origin.floor); const end=nodeKey(destination.buildingId,destination.floor);
  const distances=new Map([...graph.keys()].map(key=>[key,Infinity])); const previous=new Map(); const unvisited=new Set(graph.keys());
  distances.set(start,0);
  while (unvisited.size) {
    let current=null;
    for (const key of unvisited) if (current===null || distances.get(key)<distances.get(current)) current=key;
    if (current===null || distances.get(current)===Infinity) break;
    unvisited.delete(current); if (current===end) break;
    for (const edge of graph.get(current)??[]) {
      if (!unvisited.has(edge.to)) continue;
      const candidate=distances.get(current)+edge.cost;
      if (candidate<distances.get(edge.to)) { distances.set(edge.to,candidate); previous.set(edge.to,{key:current,edge}); }
    }
  }
  if (!previous.has(end) && start!==end) return null;
  const edges=[]; let cursor=end;
  while (cursor!==start) { const item=previous.get(cursor); if (!item) return null; edges.unshift(item.edge); cursor=item.key; }
  return {edges,cost:distances.get(end)};
}

function groupEdges(edges) {
  const groups=[];
  for (let index=0;index<edges.length;) {
    const edge=edges[index];
    if (edge.kind!=="vertical") { groups.push(edge); index+=1; continue; }
    const from=nodeFromKey(edge.from); let to=nodeFromKey(edge.to); let cost=edge.cost; let cursor=index+1;
    while (cursor<edges.length && edges[cursor].kind==="vertical" && nodeFromKey(edges[cursor].from).buildingId===from.buildingId) {
      to=nodeFromKey(edges[cursor].to); cost+=edges[cursor].cost; cursor+=1;
    }
    groups.push({kind:"vertical",from:edge.from,to:nodeKey(to.buildingId,to.floor),cost}); index=cursor;
  }
  return groups;
}

function verticalText(group) {
  const from=nodeFromKey(group.from); const to=nodeFromKey(group.to); const verb=to.floor>from.floor?"Поднимитесь":"Спуститесь";
  return `${verb} с ${from.floor}-го на ${to.floor}-й этаж в корпусе ${buildingById(from.buildingId).short} по лестнице или на лифте.`;
}

function transitionText(edge) {
  const from=nodeFromKey(edge.from);
  if (edge.transition.id==="c1-c3-cofix") {
    return from.buildingId==="c1"
      ? "На 2-м этаже корпуса 1 дойдите до Coffee Fix и пройдите переход. Вы попадёте на 2-й этаж корпуса 3."
      : "На 2-м этаже корпуса 3 идите к переходу у Coffee Fix. Вы попадёте на 2-й этаж корпуса 1.";
  }
  return from.buildingId==="c2"
    ? "На 4-м этаже корпуса 2 пройдите по межкорпусному переходу. Вы попадёте на 3-й этаж корпуса 3."
    : "На 3-м этаже корпуса 3 пройдите по межкорпусному переходу. Вы попадёте на 4-й этаж корпуса 2.";
}

function floorStagePoints(location,role) {
  if (location.point && location.door) {
    return role==="start"
      ? [location.point,location.door,[1030,555],[1470,545],[1740,545]]
      : [[1740,545],[1470,545],[1030,555],location.door,location.point];
  }
  return role==="start"
    ? [[350,690],[350,520],[980,520],[1740,520]]
    : [[1740,520],[980,520],[1500,520],[1500,690]];
}

function buildStages(origin,destination,groups) {
  const stages=[{
    kind:"floor",role:"start",buildingId:origin.buildingId,floor:origin.floor,
    title:`${buildingById(origin.buildingId).name} · ${origin.floor}-й этаж`,
    summary:`От «${origin.name}» к следующей точке маршрута`,
    detail:`Выйдите из «${origin.name}» в основной коридор и следуйте к отмеченной точке перехода.`,
    points:floorStagePoints(origin,"start"),
  }];
  groups.forEach(group=>{
    const from=nodeFromKey(group.from); const to=nodeFromKey(group.to);
    if (group.kind==="vertical") {
      stages.push({kind:"vertical",buildingId:to.buildingId,floor:to.floor,fromFloor:from.floor,toFloor:to.floor,title:`${buildingById(to.buildingId).name} · этажи ${from.floor} → ${to.floor}`,summary:to.floor>from.floor?"Подъём по лестнице или на лифте":"Спуск по лестнице или на лифте",detail:verticalText(group)});
    } else {
      stages.push({kind:"transition",buildingId:to.buildingId,floor:to.floor,fromBuildingId:from.buildingId,fromFloor:from.floor,toBuildingId:to.buildingId,toFloor:to.floor,title:group.transition.name,summary:`${buildingById(from.buildingId).name}, ${from.floor}-й этаж → ${buildingById(to.buildingId).name}, ${to.floor}-й этаж`,detail:transitionText(group)});
    }
  });
  if (origin.buildingId!==destination.buildingId || origin.floor!==destination.floor) {
    stages.push({kind:"floor",role:"finish",buildingId:destination.buildingId,floor:destination.floor,title:`${buildingById(destination.buildingId).name} · ${destination.floor}-й этаж`,summary:`До «${destination.name}»`,detail:`На ${destination.floor}-м этаже следуйте по отмеченному участку маршрута до «${destination.name}».`,points:floorStagePoints(destination,"finish")});
  }
  return stages;
}

export function buildRoute(origin,destination) {
  if (!origin || !destination) return {status:"empty",steps:[],points:null,stages:[]};
  if (origin.id===destination.id) return {status:"same",steps:["Вы уже находитесь в выбранной точке."],points:null,stages:[],estimatedMinutes:0};
  if (!origin.verified || !destination.verified) {
    const location=!origin.verified?origin:destination;
    return {status:"unverified",points:null,stages:[],steps:[`Для «${location.name}» известна общая зона, но точное положение на плане ещё не подтверждено.`]};
  }

  const sameFloor=origin.buildingId===destination.buildingId && origin.floor===destination.floor;
  if (sameFloor) {
    const points=sameFloorPoints(origin,destination);
    return {
      status:"ready",kind:"same-floor",points,estimatedMinutes:2,
      stages:[{kind:"floor",role:"complete",buildingId:origin.buildingId,floor:origin.floor,title:`${buildingById(origin.buildingId).name} · ${origin.floor}-й этаж`,summary:`${origin.name} → ${destination.name}`,detail:`Весь маршрут проходит на ${origin.floor}-м этаже. Следуйте по синей линии на плане.`,points}],
      steps:points?sameFloorInstructions(origin,destination):[`Выйдите из «${origin.name}» в коридор.`,`Следуйте по указателям до «${destination.name}».`],
    };
  }

  const path=shortestPath(origin,destination);
  if (!path) return {status:"unavailable",kind:"unavailable",points:null,stages:[],steps:["Для выбранных точек пока нет связного маршрута."]};
  const groups=groupEdges(path.edges);
  const steps=[`Выйдите из «${origin.name}» в основной коридор.`,...groups.map(group=>group.kind==="vertical"?verticalText(group):transitionText(group)),`На ${destination.floor}-м этаже следуйте к «${destination.name}».`];
  return {
    status:"ready",kind:origin.buildingId===destination.buildingId?"cross-floor":"cross-building",points:null,
    cost:path.cost,estimatedMinutes:Math.max(3,Math.round((path.cost+8)/6)),steps,stages:buildStages(origin,destination,groups),
  };
}
