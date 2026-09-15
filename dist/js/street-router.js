import { buildRoute } from "./router.js?v=90926fb31109";
import { locationById } from "./campus-data.js?v=90926fb31109";
import { metroPoint,streetGate,campusOutdoor } from "./outdoor-data.js?v=90926fb31109";
import { evaluateEdge } from "./routing-model.js?v=90926fb31109";

const cache=new Map();
export function decodePolyline(encoded){
  let index=0,lat=0,lng=0;const points=[];
  const read=()=>{let result=0,shift=0,byte;do{if(index>=encoded.length||shift>30)throw new Error("Invalid route geometry");byte=encoded.charCodeAt(index++)-63;result|=(byte&31)<<shift;shift+=5;}while(byte>=32);return result&1?~(result>>1):result>>1;};
  while(index<encoded.length){lat+=read();lng+=read();points.push([lng/1e6,lat/1e6]);}
  return points;
}

export async function fetchWalkingRoute(from,to,{signal,fetcher=fetch}={}){
  const key=JSON.stringify([from,to]);
  if(cache.has(key)&&Date.now()-cache.get(key).saved<300000)return cache.get(key).route;
  const url=new URL("https://valhalla1.openstreetmap.de/route");
  url.searchParams.set("json",JSON.stringify({locations:[from,to].map(([lon,lat])=>({lon,lat})),costing:"pedestrian",language:"ru-RU",units:"kilometers"}));
  const response=await fetcher(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error("Walking API unavailable");
  const data=await response.json(),trip=data.trip,leg=trip?.legs?.[0];
  if(trip?.status!==0||!leg?.shape||!Number.isFinite(trip.summary?.time)||!Number.isFinite(trip.summary?.length))throw new Error("No walking route");
  const coordinates=typeof leg.shape==="string"?decodePolyline(leg.shape):leg.shape.coordinates;
  if(!Array.isArray(coordinates)||coordinates.length<2||coordinates.some(p=>!p.every(Number.isFinite))||trip.summary.length>3)throw new Error("Invalid walking route");
  const route={coordinates,seconds:trip.summary.time,meters:Math.round(trip.summary.length*1000),instructions:leg.maneuvers.map(m=>m.instruction)};
  cache.set(key,{saved:Date.now(),route});return route;
}

export async function buildRouteWithStreet(origin,destination,options={}){
  if(origin?.id!=="metro"&&destination?.id!=="metro")return buildRoute(origin,destination);
  if(!origin||!destination||origin.id===destination.id)return buildRoute(origin,destination);
  const fromMetro=origin.id==="metro",checkpoint=locationById("checkpoint");
  const inside=buildRoute(fromMetro?checkpoint:origin,fromMetro?destination:checkpoint);
  if(!["ready","same"].includes(inside.status))return inside;
  try{
    const walking=await fetchWalkingRoute(fromMetro?metroPoint:streetGate,fromMetro?streetGate:metroPoint,options);
    const street={kind:"street",buildingId:"entry",floor:1,title:"Метро ↔ кампус",summary:fromMetro?"От метро к КПП":"От КПП к метро",detail:`Пешком · ${walking.meters} м. ${walking.instructions.join(" ")}`,geoPoints:walking.coordinates,points:[],fromLabel:fromMetro?"Метро":"КПП",toLabel:fromMetro?"КПП":"Метро",source:"Пешеходный маршрут · Valhalla / OpenStreetMap",meters:walking.meters};
    const gate={kind:"outdoor",buildingId:"entry",floor:1,title:"КПП · выход к проезду",summary:fromMetro?"Войдите на территорию через КПП":"Выйдите через КПП к проезду",detail:"КПП выходит непосредственно к 4-му Вешняковскому проезду.",points:fromMetro?[campusOutdoor.streetGate,[140,95],campusOutdoor.checkpoint]:[campusOutdoor.checkpoint,[140,95],campusOutdoor.streetGate],fromLabel:fromMetro?"Проезд":"КПП",toLabel:fromMetro?"КПП":"Проезд"};
    const stages=fromMetro?[street,gate,...inside.stages]:[...inside.stages,gate,street];
    const gateSeconds=evaluateEdge({id:"gate"},{id:"checkpoint"},{kind:"outdoor",points:gate.points}).seconds;
    const estimatedSeconds=walking.seconds+gateSeconds+(inside.estimatedSeconds??0);
    return {status:"ready",kind:"outdoor",stages,points:null,estimatedSeconds,timingBasis:"mixed",estimatedMinutes:Math.max(1,Math.ceil(estimatedSeconds/60)),steps:stages.map(s=>s.summary+". "+s.detail)};
  }catch(error){
    if(options.signal?.aborted)throw error;
    return {status:"street-unavailable",stages:[],steps:["Не удалось получить пешеходный маршрут к метро. Проверьте интернет и нажмите «Построить маршрут» ещё раз."]};
  }
}
