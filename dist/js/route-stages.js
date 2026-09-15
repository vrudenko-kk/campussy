const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const clean=points=>points.filter((p,i)=>i===0||distance(p,points[i-1])>.01);

export function createRouteStages(path,origin,destination,{nodes,buildingById}){
  const groups=[];
  for(const edge of path.edges){
    const previous=groups.at(-1),from=nodes.get(edge.from),to=nodes.get(edge.to);
    const groupable=previous?.kind===edge.kind&&(
      edge.kind==="floor"&&previous.buildingId===from.buildingId&&previous.floor===from.floor ||
      edge.kind==="vertical"&&previous.buildingId===from.buildingId&&previous.side===edge.side&&previous.transport===edge.transport&&previous.shaft===edge.shaft ||
      edge.kind==="outdoor");
    if(groupable){previous.edges.push(edge);previous.to=to;}
    else groups.push({kind:edge.kind,buildingId:from.buildingId,floor:from.floor,side:edge.side,transport:edge.transport,shaft:edge.shaft,from,to,edges:[edge]});
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
    const entryTurn=from.buildingId==="entry"&&next?.kind==="transition"&&["c1","c2"].includes(next.to.buildingId)?`Поверните ${next.to.buildingId==="c1"?"направо в корпус 1":"налево в корпус 2"}`:null;
    const summary=entryTurn??(final?"До «"+destination.name+"»":from.buildingId==="entry"&&to.id.endsWith(":courtyard")?"Пройдите прямо к выходу во двор":first?"От «"+origin.name+"» к "+target:"Пройдите к "+target);
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

