import { buildingById, floorAreas, getFloorPlan, transitions } from "./campus-data.js";

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
        addNode(key(room.id+":door"),room.door,area.id,floor);
      }
      for(const [a,b]of plan.edges)join(key(a),key(b));
      for(const room of plan.rooms){join(key(room.id),key(room.id+":door"));join(key(room.id+":door"),key(room.access));}
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
    join(connector(from.buildingId,from.floor,from.buildingId==="c1"?"east":"west"),connector(to.buildingId,to.floor,from.buildingId==="c1"?"west":"east"),{kind:"transition",cost:180,transition});
  }
  // Both supplied plans identify the four lift shafts on floors 1 and 8.
  for(const side of ["w","e"])for(const number of [1,2]){
    join(nodeId("c3",1,`lift-c3-1-${side}${number}`),nodeId("c3",8,`lift-c3-8-${side}${number}`),{kind:"vertical",cost:300,side:side==="w"?"west":"east",transport:"lift"});
  }
  // The shared entrance block is distinct from corpus 3.
  addNode("checkpoint",[190,95]);addNode("courtyard",[500,430]);
  join("checkpoint",nodeId("entry",1,"main-entrance"),{kind:"outdoor",cost:240,points:[[190,95],[190,150],[500,150],[500,220]],label:"КПП ↔ главный вход"});
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
  return groups.map((group,index)=>{
    const {from,to,kind}=group;
    if(kind==="outdoor"){
      const checkpoint=group.edges.some(e=>e.from==="checkpoint"||e.to==="checkpoint");
      const forward=checkpoint?from.id==="checkpoint":to.buildingId==="c3"||to.id==="courtyard";
      const summary=checkpoint?(forward?"От КПП к главному входу":"От главного входа к КПП"):(forward?"Через внутренний двор к корпусу 3":"Через внутренний двор к главному входу");
      return {kind,buildingId:"entry",floor:1,title:"Территория кампуса",summary,detail:checkpoint?"Главный вход находится в общем блоке между корпусами 1 и 2.":"Пройдите прямо через внутренний двор. Вход в корпус 3 находится на 1-м этаже.",points:clean(group.edges.flatMap(e=>e.points)),fromLabel:checkpoint?(forward?"КПП":"Вход"):(forward?"Вход":"Корпус 3"),toLabel:checkpoint?(forward?"Вход":"КПП"):(forward?"Корпус 3":"Вход")};
    }
    const area=buildingById(to.buildingId);
    if(kind==="vertical")return {kind,transport:group.transport??"stairs",buildingId:to.buildingId,floor:to.floor,fromFloor:from.floor,toFloor:to.floor,title:area.name+" · "+from.floor+" → "+to.floor+" этаж",summary:(to.floor>from.floor?"Поднимитесь":"Спуститесь")+(group.transport==="lift"?" на лифте":" по лестнице")+" на "+to.floor+"-й этаж",detail:area.name+", "+(group.side==="west"?"левая":"правая")+(group.transport==="lift"?" группа лифтов.":" лестница.")+" С "+from.floor+"-го на "+to.floor+"-й этаж.",connectorPoint:to.point,points:[]};
    if(kind==="transition"){
      const transition=group.edges[0].transition;
      return {kind,buildingId:to.buildingId,floor:to.floor,fromBuildingId:from.buildingId,fromFloor:from.floor,toBuildingId:to.buildingId,toFloor:to.floor,title:transition?.name??"Общий входной блок",summary:buildingById(from.buildingId).name+", "+from.floor+" → "+area.name+", "+to.floor,detail:transition?.id==="c1-c3-cofix"?"Пройдите через переход у Coffix на 2-м этаже.":transition?"Переход соединяет 4-й этаж корпуса 2 с 3-м этажом корпуса 3.":"Пройдите через общий входной блок между корпусами 1 и 2.",connectorPoint:to.point,points:[]};
    }
    const final=index===groups.length-1,first=index===0;
    const points=clean([from.point,...group.edges.map(e=>nodes.get(e.to).point)]);
    const next=groups[index+1];
    const target=next?.transport==="lift"?"лифтам":next?.kind==="vertical"?"лестнице":"переходу";
    const summary=final?"До «"+destination.name+"»":from.buildingId==="entry"&&to.id.endsWith(":courtyard")?"Пройдите прямо к выходу во двор":first?"От «"+origin.name+"» к "+target:"Пройдите к "+target;
    const detail=final?"Следуйте по линии до «"+destination.name+"».":from.buildingId==="c3"&&from.floor===1?"В холле гардероб находится прямо, по две кабины лифта — слева и справа. Лестница — сразу слева от входа.":from.buildingId==="entry"?"Главный вход находится в общем блоке между корпусами 1 и 2.":"Следуйте по коридору через отмеченные дверные проёмы.";
    return {kind,buildingId:from.buildingId,floor:from.floor,title:buildingById(from.buildingId).name+" · "+from.floor+"-й этаж",summary,detail,role:first&&final?"complete":first?"start":final?"finish":"intermediate",points};
  });
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
