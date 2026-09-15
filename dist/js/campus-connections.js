import { transitions,buildingById } from "./campus-data.js?v=90926fb31109";
import { campusOutdoor } from "./outdoor-data.js?v=90926fb31109";

export const graphNodeId=(area,floor,id)=>`${area}:${floor}:${id}`;

// Explicit physical connections; no route-specific exceptions or room-number rules.
export function campusConnections(){
  const links=transitions.map(t=>({
    from:graphNodeId(t.from.buildingId,t.from.floor,"e-wing"),
    to:graphNodeId(t.to.buildingId,t.to.floor,t.from.buildingId==="c1"?"bridgeW":"bridgeE"),
    kind:"transition",meters:t.distanceMeters,delaySeconds:4,transition:t,
  }));
  for(const area of ["c1","c2"])links.push({
    from:graphNodeId("entry",1,area==="c1"?"east":"west"),to:graphNodeId(area,1,`${area}-1-exit-w`),
    kind:"transition",meters:3,delaySeconds:2,
    transition:{id:`entry-${area}`,name:`Главный вход ↔ ${buildingById(area).name}`,detail:`От главного входа ${area==="c1"?"направо в корпус 1":"налево в корпус 2"}.`},
  });
  links.push(
    {from:"checkpoint",to:graphNodeId("entry",1,"main-entrance"),kind:"outdoor",points:[[190,95],[190,150],[500,150],[500,220]],label:"КПП ↔ главный вход"},
    {from:"checkpoint",to:graphNodeId("c1",1,"c1-1-exit-w"),kind:"outdoor",points:[[190,95],[190,150],[135,150],[135,550],[160,550]],label:"КПП ↔ вход корпуса 1"},
    {from:graphNodeId("entry",1,"courtyard"),to:"courtyard",kind:"outdoor",points:[[500,275],[500,430]],label:"Главный вход ↔ внутренний двор"},
    {from:"courtyard",to:graphNodeId("c3",1,"entrance-c3"),kind:"outdoor",points:[[500,430],[500,620]],label:"Внутренний двор ↔ вход в корпус 3"},
  );
  return links;
}
export const outdoorNodes=[{id:"checkpoint",point:campusOutdoor.checkpoint},{id:"courtyard",point:campusOutdoor.courtyard},{id:"metro",point:[60,775]}];
