import test from "node:test";
import assert from "node:assert/strict";
import { findShortestPath } from "../dist/js/shortest-path.js";
import { routingProfile,evaluateEdge } from "../dist/js/routing-model.js";
import { compileNavigationGraph,getNavigationGraph } from "../dist/js/navigation-graph.js";
import { walkingMeasurements } from "../dist/js/routing-calibration.js";
import { buildRoute } from "../dist/js/router.js";
import { locationById,floorAreas,getFloorPlan } from "../dist/js/campus-data.js";
import { campusConnections,outdoorNodes } from "../dist/js/campus-connections.js";

test("Dijkstra matches independent Floyd–Warshall for every pair, including zero-cost cycles",()=>{
  const n=24,graph={nodes:new Map(),edges:new Map()},d=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
  for(let i=0;i<n;i++){graph.nodes.set(i,{});graph.edges.set(i,[]);}
  for(let i=0;i<n-1;i++)for(let j=0;j<n-1;j++)if(i!==j&&(i*31+j*17)%7<2){const cost=(i*13+j*7)%11;graph.edges.get(i).push({from:i,to:j,cost});d[i][j]=cost;}
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)assert.equal(findShortestPath(graph,i,j)?.cost??Infinity,d[i][j]);
  assert.equal(findShortestPath(graph,"missing",0),null);
  graph.edges.get(0).push({from:0,to:n-1,cost:-1});assert.throws(()=>findShortestPath(graph,0,n-1),/Invalid edge/);
});

test("checkpoint and shared main entrance reach 1515 without courtyard or corpus 3",()=>{
  for(const origin of ["checkpoint","main-entrance","entrance-c1"]){
    const result=buildRoute(locationById(origin),locationById("1515"));
    assert.equal(result.status,"ready");
    assert.ok(result.stages.every(s=>s.buildingId!=="c3"&&!s.summary.includes("двор")));
    assert.equal(result.estimatedMinutes,Math.ceil(result.estimatedSeconds/60));
  }
  assert.match(buildRoute(locationById("main-entrance"),locationById("1515")).stages[0].summary,/направо в корпус 1/);
  assert.equal(buildRoute(locationById("checkpoint"),locationById("1515")).stages[0].toLabel,"Корпус 1");
  assert.ok(buildRoute(locationById("1515"),locationById("checkpoint")).stages.every(s=>s.buildingId!=="c3"));
});

test("measured entrance walk totals 30 seconds; C1 ascent totals 120 seconds",()=>{
  const graph=getNavigationGraph(),m=walkingMeasurements[0];
  const walk=findShortestPath(graph,m.from,m.to,{allowEdge:e=>["floor","transition"].includes(e.kind)&&["entry","c1"].includes(graph.nodes.get(e.to).buildingId)&&graph.nodes.get(e.to).floor===1&&!graph.nodes.get(e.to).terminalOnly});
  assert.ok(Math.abs(walk.cost-30)<1e-9);
  assert.ok(walk.edges.every(e=>e.basis==="calibrated"));
  const ascent=findShortestPath(graph,"c1:1:c1-1-stairs-w","c1:5:c1-5-stairs-w",{allowEdge:e=>e.kind==="vertical"&&e.transport==="stairs"});
  assert.equal(ascent.cost,120);assert.equal(ascent.edges.length,4);
});

test("lift waits once per ride and shaft connectivity scales linearly",()=>{
  const graph=getNavigationGraph();
  const ride=findShortestPath(graph,"c3:1:lift-c3-1-w1","c3:8:lift-c3-8-w1",{allowEdge:e=>e.transport==="lift"&&e.shaft==="w1"});
  assert.equal(ride.cost,120+12+7*6);
  assert.equal(ride.edges.filter(e=>e.phase==="board").length,1);
  const shaft=[...graph.edges.values()].flat().filter(e=>e.shaft==="w1");
  assert.equal(shaft.length,9*2+8*2);
});

test("no transit through unrelated multi-door rooms",()=>{
  const graph=getNavigationGraph(),from="c1:5:c1-5-stairs-w",to="c1:5:c1-5-stairs-e";
  const route=buildRoute({id:"start",graphNode:from,verified:true,name:"Лестница",buildingId:"c1",floor:5},{id:"end",graphNode:to,verified:true,name:"Лестница",buildingId:"c1",floor:5});
  assert.equal(route.status,"ready");
  const plan=getFloorPlan("c1",5);
  for(const room of plan.rooms.filter(r=>r.type==="room"))assert.ok(!route.stages.flatMap(s=>s.points).some(p=>p[0]===room.point[0]&&p[1]===room.point[1]),room.id);
});

test("metric scale changes do not change walk duration; invalid data fails early",()=>{
  const a={id:"a",point:[0,0],buildingId:"c1"},b={id:"b",point:[100,0],buildingId:"c1"};
  const initial=evaluateEdge(a,b,{kind:"floor"}).seconds;
  const scaled=evaluateEdge(a,{...b,point:[1000,0]},{kind:"floor"},{...routingProfile,metersPerUnit:{c1:.004}}).seconds;
  assert.equal(initial,scaled);
  assert.throws(()=>evaluateEdge(a,b,{measuredSeconds:-10}),/Invalid measured/);
  assert.throws(()=>evaluateEdge(a,b,{kind:"floor"},{...routingProfile,metersPerUnit:{}}),/Missing plan scale/);
  assert.throws(()=>compileNavigationGraph({areas:[],getPlan:()=>{},outdoors:[{id:"a",point:[0,0]},{id:"a",point:[1,1]}]}),/Duplicate/);
  assert.throws(()=>compileNavigationGraph({areas:[],getPlan:()=>{},outdoors:[{id:"a",point:[0,0]}],connections:[{from:"a",to:"b"}]}),/Missing graph/);
});

test("updated waiting time changes optimal path without destination-specific rules",()=>{
  const graph=compileNavigationGraph({areas:floorAreas,getPlan:getFloorPlan,connections:campusConnections(),outdoors:outdoorNodes,measurements:walkingMeasurements,profile:{...routingProfile,liftWaitSeconds:0}});
  const result=buildRoute(locationById("main-entrance"),locationById("1515"),{graph});
  assert.ok(result.stages.some(s=>s.transport==="lift"));
});
