import { buildingById, buildings, floorGeometryFor, transitions } from "./campus-data.js";

const detailedCorridor = [[550,555],[760,555],[1030,555],[1280,555],[1470,545],[1740,545]];
const genericCorridor = Array.from({length:18},(_,index)=>[220+index*92,520]);
const nodeKey = (buildingId,floor) => `${buildingId}:${floor}`;
const nodeFromKey = key => { const [buildingId,floor]=key.split(":"); return {buildingId,floor:Number(floor)}; };
const accessOf = location => location.routeAccess??{buildingId:location.buildingId,floor:location.floor};

function densify(nodes,maxStep=75) {
  const result=[nodes[0]];
  for (let index=1;index<nodes.length;index+=1) {
    const from=nodes[index-1]; const to=nodes[index];
    const distance=Math.hypot(to[0]-from[0],to[1]-from[1]);
    const parts=Math.max(1,Math.ceil(distance/maxStep));
    for (let part=1;part<=parts;part+=1) result.push([
      from[0]+(to[0]-from[0])*(part/parts),
      from[1]+(to[1]-from[1])*(part/parts),
    ]);
  }
  return result;
}

function corridorFor(location) {
  return densify(location.buildingId==="c1" && Number(location.floor)===5?detailedCorridor:genericCorridor);
}

function nearestIndex(point,nodes) {
  return nodes.reduce((best,node,index) => Math.abs(node[0]-point[0]) < Math.abs(nodes[best][0]-point[0]) ? index : best,0);
}

function sameFloorPoints(origin,destination) {
  const from=floorGeometryFor(origin); const to=floorGeometryFor(destination); const corridor=corridorFor(origin);
  const fromIndex=nearestIndex(from.door,corridor); const toIndex=nearestIndex(to.door,corridor);
  const direction=fromIndex<=toIndex?1:-1; const points=[from.point,from.door];
  for (let index=fromIndex;;index+=direction) { points.push(corridor[index]); if (index===toIndex) break; }
  points.push(to.door,to.point); return points;
}

function sameFloorInstructions(origin,destination) {
  const originDoor=floorGeometryFor(origin).door; const destinationDoor=floorGeometryFor(destination).door;
  const direction=destinationDoor[0]>originDoor[0]?"направо":destinationDoor[0]<originDoor[0]?"налево":"прямо";
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
  const graph=buildCampusGraph(); const originAccess=accessOf(origin); const destinationAccess=accessOf(destination);
  const start=nodeKey(originAccess.buildingId,originAccess.floor); const end=nodeKey(destinationAccess.buildingId,destinationAccess.floor);
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
  const geometry=floorGeometryFor(location); const corridor=corridorFor(location);
  const doorIndex=nearestIndex(geometry.door,corridor);
  const toExit=corridor.slice(doorIndex);
  return role==="start"
    ? [geometry.point,geometry.door,...toExit]
    : [...toExit].reverse().concat([geometry.door,geometry.point]);
}

function outdoorStage(location,role) {
  const access=accessOf(location); const toEntrance=role==="start";
  return {
    kind:"outdoor",role,buildingId:access.buildingId,floor:access.floor,
    title:"Территория кампуса",
    summary:toEntrance?"От КПП до центрального входа":"От центрального входа до КПП",
    detail:toEntrance
      ? "Выйдите из проходной и следуйте по территории кампуса к центральному входу корпуса 3."
      : "Выйдите из корпуса 3 через центральный вход и следуйте по территории кампуса к проходной.",
  };
}

function floorStage(location,role) {
  return {
    kind:"floor",role,buildingId:location.buildingId,floor:location.floor,
    title:`${buildingById(location.buildingId).name} · ${location.floor}-й этаж`,
    summary:role==="start"?`От «${location.name}» к следующей точке маршрута`:`До «${location.name}»`,
    detail:role==="start"
      ? `Выйдите из «${location.name}» в основной коридор и следуйте к отмеченной точке перехода.`
      : `На ${location.floor}-м этаже следуйте по отмеченному участку маршрута до «${location.name}».`,
    points:floorStagePoints(location,role),
  };
}

function buildStages(origin,destination,groups) {
  const originAccess=accessOf(origin); const destinationAccess=accessOf(destination);
  const stages=[origin.routeAccess?outdoorStage(origin,"start"):floorStage(origin,"start")];
  groups.forEach(group=>{
    const from=nodeFromKey(group.from); const to=nodeFromKey(group.to);
    if (group.kind==="vertical") {
      stages.push({kind:"vertical",buildingId:to.buildingId,floor:to.floor,fromFloor:from.floor,toFloor:to.floor,title:`${buildingById(to.buildingId).name} · этажи ${from.floor} → ${to.floor}`,summary:to.floor>from.floor?"Подъём по лестнице или на лифте":"Спуск по лестнице или на лифте",detail:verticalText(group)});
    } else {
      stages.push({kind:"transition",buildingId:to.buildingId,floor:to.floor,fromBuildingId:from.buildingId,fromFloor:from.floor,toBuildingId:to.buildingId,toFloor:to.floor,title:group.transition.name,summary:`${buildingById(from.buildingId).name}, ${from.floor}-й этаж → ${buildingById(to.buildingId).name}, ${to.floor}-й этаж`,detail:transitionText(group)});
    }
  });
  if (destination.routeAccess) {
    stages.push(outdoorStage(destination,"finish"));
  } else if (originAccess.buildingId!==destinationAccess.buildingId || originAccess.floor!==destinationAccess.floor || origin.routeAccess) {
    stages.push(floorStage(destination,"finish"));
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

  const originAccess=accessOf(origin); const destinationAccess=accessOf(destination);
  const sameFloor=!origin.routeAccess&&!destination.routeAccess&&originAccess.buildingId===destinationAccess.buildingId&&originAccess.floor===destinationAccess.floor;
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
  const steps=[
    origin.routeAccess
      ? "От КПП пройдите по территории кампуса к центральному входу корпуса 3."
      : `Выйдите из «${origin.name}» в основной коридор.`,
    ...groups.map(group=>group.kind==="vertical"?verticalText(group):transitionText(group)),
    destination.routeAccess
      ? "Выйдите через центральный вход корпуса 3 и пройдите по территории кампуса к КПП."
      : `На ${destination.floor}-м этаже следуйте к «${destination.name}».`,
  ];
  return {
    status:"ready",kind:originAccess.buildingId===destinationAccess.buildingId?"cross-floor":"cross-building",points:null,
    cost:path.cost,estimatedMinutes:Math.max(3,Math.round((path.cost+8+(origin.routeAccess||destination.routeAccess?8:0))/6)),steps,stages:buildStages(origin,destination,groups),
  };
}
