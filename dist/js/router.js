import { buildingById, floorAreas, getFloorPlan, transitions } from "./campus-data.js?v=a56ba11e977f";
import { campusOutdoor } from "./outdoor-data.js?v=a56ba11e977f";

const nodeId=(area,floor,id)=>area+":"+floor+":"+id;
const roomId=location=>location.graphNode??nodeId(location.buildingId,location.floor,location.id);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clean=points=>points.filter((p,i)=>i===0||distance(p,points[i-1])>.01);
let campusGraph;

export function getNavigationGraph(){
  if(campusGraph)return campusGraph;
  const nodes=new Map(),edges=new Map();
  const addNode=(id,point,buildingId=null,floor=null)=>{nodes.set(id,{id,point,buildingId,floor});edges.set(id,[]);};
  const join=(a,b,info={})=>{
    if(!nodes.has(a)||!nodes.has(b))throw new Error("Missing graph endpoint: "+a+" → "+b);
    const cost=info.cost??distance(nodes.get(a).point,nodes.get(b).point);
    edges.get(a).push({from:a,to:b,cost,kind:"floor",...info});
    edges.get(b).push({from:b,to:a,cost,kind:"floor",...info,points:info.points?[...info.points].reverse():undefined});
  };
  const connector=(area,floor,side)=>nodeId(area,floor,getFloorPlan(area,floor).connectors[side]);
  for(const area of floorAreas){
    for(const floor of area.floors){
      const plan=getFloorPlan(area.id,floor),key=id=>nodeId(area.id,floor,id);
      for(const [id,point]of Object.entries(plan.nodes))addNode(key(id),point,area.id,floor);
      for(const room of plan.rooms){
        addNode(key(room.id),room.point,area.id,floor);
        const doors=room.doors??[{point:room.door,access:room.access}];
        doors.forEach((door,i)=>addNode(key(room.id+":door"+i),door.point,area.id,floor));
      }
      for(const [a,b]of plan.edges)join(key(a),key(b));
      for(const room of plan.rooms){
        const doors=room.doors??[{point:room.door,access:room.access}];
        doors.forEach((door,i)=>{join(key(room.id),key(room.id+":door"+i));join(key(room.id+":door"+i),key(door.access));});
      }
    }
    for(let i=1;i<area.floors.length;i++){
      const a=area.floors[i-1],b=area.floors[i];
      for(const side of ["west","east"]){
        if(getFloorPlan(area.id,a).connectors[side]&&getFloorPlan(area.id,b).connectors[side])join(connector(area.id,a,side),connector(area.id,b,side),{kind:"vertical",cost:240,side});
      }
    }
  }
  for(const transition of transitions){
    const {from,to}=transition;
    join(nodeId(from.buildingId,from.floor,"e-wing"),connector(to.buildingId,to.floor,from.buildingId==="c1"?"bridgeWest":"bridgeEast"),{kind:"transition",cost:180,transition});
  }
  // All served floors share the same four shafts; include a boarding penalty.
  for(const side of ["w","e"])for(const number of [1,2]){
    for(let a=1;a<=9;a++)for(let b=a+1;b<=9;b++)join(nodeId("c3",a,`lift-c3-${a}-${side}${number}`),nodeId("c3",b,`lift-c3-${b}-${side}${number}`),{kind:"vertical",cost:120+(b-a)*45,side:side==="w"?"west":"east",transport:"lift"});
  }
  for(const area of ["c1","c2"])join(connector("entry",1,area==="c1"?"toC1":"toC2"),nodeId(area,1,`${area}-1-exit-w`),{kind:"transition",cost:70,transition:{id:`entry-${area}`,name:`Главный вход ↔ ${buildingById(area).name}`,detail:`От главного входа ${area==="c1"?"направо в корпус 1":"налево в корпус 2"}.`}});
  // The shared entrance block is distinct from corpus 3.
  addNode("metro",[60,775]);
  addNode("checkpoint",campusOutdoor.checkpoint);addNode("courtyard",campusOutdoor.courtyard);
  join("checkpoint",nodeId("entry",1,"main-entrance"),{kind:"outdoor",cost:240,points:[[190,95],[190,150],[500,150],[500,220]],label:"КПП ↔ главный вход"});
  join("checkpoint",nodeId("c1",1,"c1-1-exit-w"),{kind:"outdoor",cost:600,points:[[190,95],[190,150],[135,150],[135,550],[160,550]],label:"КПП ↔ вход корпуса 1"});
  join(connector("entry",1,"courtyard"),"courtyard",{kind:"outdoor",cost:150,points:[[500,275],[500,430]],label:"Главный вход ↔ внутренний двор"});
  join("courtyard",nodeId("c3",1,"entrance-c3"),{kind:"outdoor",cost:150,points:[[500,430],[500,620]],label:"Внутренний двор ↔ вход в корпус 3"});
  campusGraph={nodes,edges};return campusGraph;
}

function shortestPath(start,end){
  const {nodes,edges}=getNavigationGraph();
  if(!nodes.has(start)||!nodes.has(end))return null;
  const distances=new Map([[start,0]]),previous=new Map(),pending=new Set(nodes.keys());
  while(pending.size){
    let current=null,best=Infinity;
    for(const id of pending){const value=distances.get(id)??Infinity;if(value<best){current=id;best=value;}}
    if(current===null||current===end)break;
    pending.delete(current);
    for(const edge of edges.get(current)){
      const candidate=best+edge.cost;
      if(pending.has(edge.to)&&candidate<(distances.get(edge.to)??Infinity)){distances.set(edge.to,candidate);previous.set(edge.to,edge);}
    }
  }
  if(!distances.has(end))return null;
  const path=[];let cursor=end;
  while(cursor!==start){const edge=previous.get(cursor);if(!edge)return null;path.unshift(edge);cursor=edge.from;}
  return {edges:path,cost:distances.get(end)};
}

function stagesFor(path,origin,destination){
  const {nodes}=getNavigationGraph(),groups=[];
  for(const edge of path.edges){
    const previous=groups.at(-1),from=nodes.get(edge.from),to=nodes.get(edge.to);
    const groupable=previous?.kind===edge.kind&&(
      edge.kind==="floor"&&previous.buildingId===from.buildingId&&previous.floor===from.floor ||
      edge.kind==="vertical"&&previous.buildingId===from.buildingId&&previous.side===edge.side&&previous.transport===edge.transport ||
      edge.kind==="outdoor");
    if(groupable){previous.edges.push(edge);previous.to=to;}
    else groups.push({kind:edge.kind,buildingId:from.buildingId,floor:from.floor,side:edge.side,transport:edge.transport,from,to,edges:[edge]});
  }
  const stages=groups.map((group,index)=>{
    const {from,to,kind}=group;
    if(kind==="outdoor"){
      const checkpoint=group.edges.some(e=>e.from==="checkpoint"||e.to==="checkpoint");
      const c1=from.buildingId==="c1"||to.buildingId==="c1";
      if(c1)return {kind,buildingId:"entry",floor:1,title:"Территория кампуса",summary:from.id==="checkpoint"?"От КПП ко входу корпуса 1":"От корпуса 1 к КПП",detail:"Следуйте вдоль корпуса 1 по территории кампуса.",points:clean(group.edges.flatMap(e=>e.points)),fromLabel:from.id==="checkpoint"?"КПП":"Корпус 1",toLabel:to.id==="checkpoint"?"КПП":"Корпус 1"};
      const forward=checkpoint?from.id==="checkpoint":to.buildingId==="c3"||to.id==="courtyard";
      const summary=checkpoint?(forward?"От КПП к главному входу":"От главного входа к КПП"):(forward?"Через внутренний двор к корпусу 3":"Через внутренний двор к главному входу");
      return {kind,buildingId:"entry",floor:1,title:"Территория кампуса",summary,detail:checkpoint?"Главный вход находится в общем блоке между корпусами 1 и 2.":"Пройдите прямо через внутренний двор. Вход в корпус 3 находится на 1-м этаже.",points:clean(group.edges.flatMap(e=>e.points)),fromLabel:checkpoint?(forward?"КПП":"Вход"):(forward?"Вход":"Корпус 3"),toLabel:checkpoint?(forward?"Вход":"КПП"):(forward?"Корпус 3":"Вход")};
    }
    const area=buildingById(to.buildingId);
    if(kind==="vertical")return {kind,transport:group.transport??"stairs",buildingId:to.buildingId,floor:to.floor,fromFloor:from.floor,toFloor:to.floor,title:area.name+" · "+from.floor+" → "+to.floor+" этаж",summary:(to.floor>from.floor?"Поднимитесь":"Спуститесь")+(group.transport==="lift"?" на лифте":" по лестнице")+" на "+to.floor+"-й этаж",detail:area.name+", "+(group.side==="west"?"левая":"правая")+(group.transport==="lift"?" группа лифтов.":" лестница.")+" С "+from.floor+"-го на "+to.floor+"-й этаж.",fromBuildingId:from.buildingId,toBuildingId:to.buildingId,fromPoint:from.point,toPoint:to.point,connectorPoint:to.point,points:[]};
    if(kind==="transition"){
      const transition=group.edges[0].transition;
      return {kind,buildingId:to.buildingId,floor:to.floor,fromBuildingId:from.buildingId,fromFloor:from.floor,toBuildingId:to.buildingId,toFloor:to.floor,title:transition?.name??"Общий входной блок",summary:buildingById(from.buildingId).name+", "+from.floor+" → "+area.name+", "+to.floor,detail:transition?.id==="c1-c3-cofix"?"Пройдите через переход у Coffix на 2-м этаже.":transition?.id==="c1-c3-upper"?"Переход соединяет 4-й этаж корпуса 3 с 5-м этажом корпуса 1.":transition?.id==="c2-c3-bridge"?"Переход соединяет 3-й этаж корпуса 3 с 4-м этажом корпуса 2.":from.buildingId==="entry"?transition.detail:`Пройдите из ${buildingById(from.buildingId).name.toLowerCase()} в общий входной блок.`,fromPoint:from.point,toPoint:to.point,connectorPoint:to.point,points:[]};
    }
    const final=index===groups.length-1,first=index===0;
    const points=clean([from.point,...group.edges.map(e=>nodes.get(e.to).point)]);
    const next=groups[index+1];
    const target=next?.transport==="lift"?"лифтам":next?.kind==="vertical"?"лестнице":"переходу";
    const summary=final?"До «"+destination.name+"»":from.buildingId==="entry"&&to.id.endsWith(":courtyard")?"Пройдите прямо к выходу во двор":first?"От «"+origin.name+"» к "+target:"Пройдите к "+target;
    const detail=final?"Следуйте по линии до «"+destination.name+"».":from.buildingId==="c3"&&from.floor===1?"В холле гардероб находится прямо, по две кабины лифта — слева и справа. Лестница — сразу слева от входа.":from.buildingId==="entry"?"Главный вход находится в общем блоке между корпусами 1 и 2.":"Следуйте по коридору через отмеченные дверные проёмы.";
    return {kind,buildingId:from.buildingId,floor:from.floor,title:buildingById(from.buildingId).name+" · "+from.floor+"-й этаж",summary,detail,role:first&&final?"complete":first?"start":final?"finish":"intermediate",points};
  });
  stages.forEach((stage,index)=>{
    if(stage.kind!=="vertical"&&stage.kind!=="transition")return;
    const before=stages[index-1],after=stages[index+1];
    stage.approachPoints=before?.kind==="floor"&&before.buildingId===stage.fromBuildingId&&before.floor===stage.fromFloor?before.points:[stage.fromPoint];
    stage.departurePoints=after?.kind==="floor"&&after.buildingId===stage.toBuildingId&&after.floor===stage.toFloor?after.points:[stage.toPoint];
  });
  return stages;
}

export function buildRoute(origin,destination){
  const empty={points:null,stages:[]};
  if(!origin||!destination)return {...empty,status:"empty",steps:[]};
  if(origin.id===destination.id)return {...empty,status:"same",steps:["Вы уже находитесь в выбранной точке."],estimatedMinutes:0};
  if(!origin.verified||!destination.verified)return {...empty,status:"unverified",steps:["Для одной из выбранных точек положение на плане пока не подтверждено."]};
  const path=shortestPath(roomId(origin),roomId(destination));
  if(!path)return {...empty,status:"unavailable",steps:["Для этих точек пока нет проверенного пути на схеме."]};
  const stages=stagesFor(path,origin,destination);
  return {status:"ready",kind:stages.some(s=>s.kind==="outdoor")?"outdoor":origin.buildingId!==destination.buildingId?"cross-building":origin.floor!==destination.floor?"cross-floor":"same-floor",cost:path.cost,points:null,estimatedMinutes:Math.max(1,Math.ceil(path.cost/600)),stages,steps:stages.map(s=>s.summary+". "+s.detail)};
}
