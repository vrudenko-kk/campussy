// Every cost is elapsed seconds. Drawing coordinates are NEVER compared directly
// between plans. Replace estimates here (or measuredSeconds on a connection)
// when field measurements are available; routing logic stays unchanged.
export const routingProfile=Object.freeze({
  revision:"time-model-2-2026-09-15",
  basis:"mixed",
  walkingMetersPerSecond:1.25,
  metersPerUnit:Object.freeze({c1:.04,c2:.04,c3:.04,entry:.04,outdoor:.09}),
  // User measured 120 seconds from floor 1 to floor 5; equal-flight split.
  stairsUpSecondsPerFloor:30,
  stairsDownSecondsPerFloor:16,
  // C3/4 connects to C1/5: three C3 storeys span four C1 storeys.
  // Average height-derived estimate, not a measured C3 ascent.
  stairsFloorFactors:Object.freeze({c1:1,c2:1,c3:4/3,entry:1}),
  liftWaitSeconds:120,
  liftBoardingSeconds:12,
  liftSecondsPerFloor:6,
});

const length=points=>points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);

export function evaluateEdge(from,to,edge,profile=routingProfile){
  if(edge.measuredSeconds!==undefined){
    if(!Number.isFinite(edge.measuredSeconds)||edge.measuredSeconds<0)throw new Error("Invalid measured duration");
    return {cost:edge.measuredSeconds,seconds:edge.measuredSeconds,basis:"measured",meters:null};
  }
  let seconds,meters=null;
  if(edge.kind==="vertical"){
    const floors=Math.abs(to.floor-from.floor);
    seconds=edge.transport==="lift"
      ?edge.phase==="board"?profile.liftWaitSeconds+profile.liftBoardingSeconds:edge.phase==="alight"?0:floors*profile.liftSecondsPerFloor
      :floors*(to.floor>from.floor?profile.stairsUpSecondsPerFloor:profile.stairsDownSecondsPerFloor)*(profile.stairsFloorFactors?.[from.buildingId]??1);
  }else{
    if(edge.kind==="transition")meters=edge.meters;
    else{
      const scale=edge.kind==="outdoor"?profile.metersPerUnit.outdoor:profile.metersPerUnit[from.buildingId];
      if(!Number.isFinite(scale)||scale<=0)throw new Error(`Missing plan scale: ${from.buildingId}`);
      meters=length(edge.points??[from.point,to.point])*scale;
    }
    seconds=meters/profile.walkingMetersPerSecond+(edge.delaySeconds??0);
  }
  if(!Number.isFinite(seconds)||seconds<0||!Number.isFinite(profile.walkingMetersPerSecond)||profile.walkingMetersPerSecond<=0)throw new Error(`Invalid duration: ${from.id} → ${to.id}`);
  const calibrated=edge.kind==="vertical"&&(edge.transport==="stairs"&&from.buildingId==="c1"&&to.floor>from.floor||edge.transport==="lift"&&edge.phase==="board"&&from.buildingId==="c3");
  return {cost:seconds,seconds,basis:calibrated?"calibrated":"estimated",meters};
}
