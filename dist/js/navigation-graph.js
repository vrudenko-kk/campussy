import { floorAreas,getFloorPlan } from "./campus-data.js?v=90926fb31109";
import { campusConnections,outdoorNodes,graphNodeId } from "./campus-connections.js?v=90926fb31109";
import { routingProfile,evaluateEdge } from "./routing-model.js?v=90926fb31109";
import { calibrateWalkingEdges,walkingMeasurements } from "./routing-calibration.js?v=90926fb31109";

/** Compile a graph from plans and explicit links. This function has no UI state. */
export function compileNavigationGraph({areas,getPlan,connections=[],outdoors=[],profile=routingProfile,measurements=[]}){
  const nodes=new Map(),edges=new Map();
  const addNode=(id,point,buildingId=null,floor=null,properties={})=>{
    if(nodes.has(id))throw new Error(`Duplicate graph node: ${id}`);
    if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))throw new Error(`Invalid coordinates: ${id}`);
    nodes.set(id,Object.freeze({id,point:Object.freeze([...point]),buildingId,floor,...properties}));edges.set(id,[]);
  };
  const directed=(from,to,info={})=>{
    if(!nodes.has(from)||!nodes.has(to))throw new Error(`Missing graph endpoint: ${from} → ${to}`);
    const edge={kind:"floor",...info,from,to};
    if(edge.kind==="floor"&&(nodes.get(from).buildingId!==nodes.get(to).buildingId||nodes.get(from).floor!==nodes.get(to).floor))throw new Error(`Floor edge changes plan: ${from} → ${to}`);
    const metrics=evaluateEdge(nodes.get(from),nodes.get(to),edge,profile);
    edges.get(from).push(Object.freeze({...edge,...metrics,id:`${from}→${to}`}));
  };
  const join=(a,b,info={})=>{
    directed(a,b,info);directed(b,a,{...info,points:info.points?[...info.points].reverse():undefined});
  };
  for(const area of areas){
    const lifts=new Map();
    for(const floor of area.floors){
      const plan=getPlan(area.id,floor),key=id=>graphNodeId(area.id,floor,id);
      for(const [id,point]of Object.entries(plan.nodes))addNode(key(id),point,area.id,floor);
      for(const room of plan.rooms){
        const transit=["stairs","lift","entrance","hall"].includes(room.type);
        addNode(key(room.id),room.point,area.id,floor,{terminalOnly:!transit,locationId:room.id});
        const doors=room.doors??[{point:room.door,access:room.access}];
        doors.forEach((door,i)=>addNode(key(room.id+":door"+i),door.point,area.id,floor));
        if(room.type==="lift"){
          if(!room.shaftId)throw new Error(`Missing lift shaft: ${room.id}`);
          if(!lifts.has(room.shaftId))lifts.set(room.shaftId,[]);
          lifts.get(room.shaftId).push({floor,id:key(room.id),point:room.point});
        }
      }
      for(const [a,b]of plan.edges)join(key(a),key(b));
      for(const room of plan.rooms){
        (room.doors??[{point:room.door,access:room.access}]).forEach((door,i)=>{
          join(key(room.id),key(room.id+":door"+i));join(key(room.id+":door"+i),key(door.access));
        });
      }
    }
    const floors=[...area.floors].sort((a,b)=>a-b);
    for(let i=1;i<floors.length;i++){
      const a=floors[i-1],b=floors[i];
      for(const side of ["west","east"]){
        const from=getPlan(area.id,a).connectors[side],to=getPlan(area.id,b).connectors[side];
        if(from&&to)join(graphNodeId(area.id,a,from),graphNodeId(area.id,b,to),{kind:"vertical",transport:"stairs",side});
      }
    }
    // Boarding is paid once per ride. Virtual cabin nodes make a shaft O(floors),
    // rather than adding an edge between every possible pair of floors.
    for(const [shaft,stops]of lifts){
      stops.sort((a,b)=>a.floor-b.floor);
      const side=shaft.startsWith("w")?"west":"east";
      stops.forEach((stop,i)=>{
        const cabin=stop.id+":cabin";addNode(cabin,stop.point,area.id,stop.floor,{cabin:true});
        directed(stop.id,cabin,{kind:"vertical",transport:"lift",phase:"board",shaft,side});
        directed(cabin,stop.id,{kind:"vertical",transport:"lift",phase:"alight",shaft,side});
        if(i)join(stops[i-1].id+":cabin",cabin,{kind:"vertical",transport:"lift",phase:"ride",shaft,side});
      });
    }
  }
  for(const node of outdoors)addNode(node.id,node.point);
  for(const link of connections){
    const {from,to,...info}=link;
    if(link.closed)continue;
    if(link.oneWay)directed(from,to,info);else join(from,to,info);
  }
  calibrateWalkingEdges({nodes,edges},measurements);
  for(const list of edges.values())Object.freeze(list);
  return Object.freeze({nodes,edges,profileRevision:profile.revision});
}

let cachedGraph;
export function getNavigationGraph(){
  return cachedGraph??=compileNavigationGraph({areas:floorAreas,getPlan:getFloorPlan,connections:campusConnections(),outdoors:outdoorNodes,measurements:walkingMeasurements});
}
