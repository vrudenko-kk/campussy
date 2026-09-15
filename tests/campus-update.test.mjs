import test from "node:test";
import assert from "node:assert/strict";
import { getFloorPlan,locationById,transitions } from "../dist/js/campus-data.js";
import { buildRoute,getNavigationGraph } from "../dist/js/router.js";
import { buildRouteWithStreet,decodePolyline } from "../dist/js/street-router.js";
import { fencePoints,fencePolygon } from "../dist/js/outdoor-data.js";
const route=(a,b)=>buildRoute(locationById(a),locationById(b));

test("new C3 templates: numbering, shafts, WCs and confirmed transfers",()=>{
  for(const floor of [2,3,4,5,7,9]){
    const plan=getFloorPlan("c3",floor);
    assert.deepEqual(plan.rooms.filter(r=>r.type==="room").map(r=>r.id).sort(),[1,2,4,5,6,10,11].map(n=>`3${floor}${String(n).padStart(2,"0")}`).sort());
    assert.equal(plan.rooms.filter(r=>r.type==="lift").length,4);
    assert.equal(plan.rooms.filter(r=>r.type==="restroom").length,2);
    for(const room of plan.rooms)assert.equal(locationById(room.id).verified,true);
  }
  const a=getFloorPlan("c3",6),b=getFloorPlan("c3",8);
  assert.deepEqual(a.rooms.map(r=>[r.rect,r.door,r.point]),b.rooms.map(r=>[r.rect,r.door,r.point]));
  assert.deepEqual(a.nodes,b.nodes);assert.deepEqual(a.edges,b.edges);
  assert.deepEqual(transitions.map(t=>[t.from.buildingId,t.from.floor,t.to.buildingId,t.to.floor]),[["c1",2,"c3",2],["c2",4,"c3",3],["c1",5,"c3",4]]);
  assert.equal(locationById("3303").verified,false);
  assert.deepEqual(getFloorPlan("c3",3).passages.map(p=>p.side),["right"]);
});

test("every C3 graph edge avoids unrelated room interiors",()=>{
  const graph=getNavigationGraph();
  for(const floor of [2,3,4,5,6,7,8,9]){
    const plan=getFloorPlan("c3",floor),prefix=`c3:${floor}:`;
    for(const [id,node]of graph.nodes){
      if(node.buildingId!=="c3"||node.floor!==floor)continue;
      for(const edge of graph.edges.get(id)){
        if(edge.kind!=="floor"||edge.from>edge.to)continue;
        const end=graph.nodes.get(edge.to),linked=[edge.from,edge.to].map(n=>n.slice(prefix.length).split(":door")[0]);
        for(let i=1;i<20;i++){
          const p=node.point.map((v,j)=>v+(end.point[j]-v)*i/20);
          for(const room of plan.rooms){
            if(linked.includes(room.id))continue;
            const [x,y,w,h]=room.rect;
            assert.ok(!(p[0]>x+.5&&p[0]<x+w-.5&&p[1]>y+.5&&p[1]<y+h-.5),`${edge.from} → ${edge.to} crosses ${room.id}`);
          }
        }
      }
    }
  }
});

test("entrance branches remain on floor 1 and upper bridge connects C3/4 with C1/5",()=>{
  for(const id of ["c1-1-exit-w","c2-1-exit-w"]){
    for(const [a,b]of [["main-entrance",id],[id,"main-entrance"]]){
      const result=route(a,b);assert.equal(result.status,"ready");
      assert.ok(result.stages.every(s=>s.kind!=="vertical"&&s.kind!=="outdoor"));
    }
  }
  for(const [a,b]of [["3401","1512"],["1512","3401"]]){
    const result=route(a,b);assert.equal(result.status,"ready");
    assert.ok(result.stages.some(s=>s.kind==="transition"&&[s.fromFloor,s.toFloor].sort().join()==="4,5"));
  }
  assert.equal(route("checkpoint","entrance-c1").status,"ready");
});

test("metro routes use pedestrian API, preserve direction and reject network failures",async()=>{
  const payload={trip:{status:0,summary:{time:148,length:.179},legs:[{shape:"ervgiBgzvagA??vBnAr@oMFgA}DwHsEuRgHeCf@gGuq@uT",maneuvers:[{instruction:"Следуйте по пешеходной дорожке."}]}]}};
  const fetcher=async url=>{
    const query=JSON.parse(url.searchParams.get("json"));assert.equal(query.costing,"pedestrian");
    return {ok:true,json:async()=>payload};
  };
  assert.equal(decodePolyline(payload.trip.legs[0].shape).length,10);
  const result=await buildRouteWithStreet(locationById("metro"),locationById("3204"),{fetcher});
  assert.equal(result.status,"ready");assert.equal(result.stages[0].kind,"street");assert.equal(result.stages[1].toLabel,"КПП");
  const failed=await buildRouteWithStreet(locationById("3204"),locationById("metro"),{fetcher:async()=>{throw new Error("offline");}});
  assert.equal(failed.status,"street-unavailable");assert.deepEqual(failed.stages,[]);
  const reverse=await buildRouteWithStreet(locationById("3204"),locationById("metro"),{fetcher});
  assert.equal(reverse.stages.at(-1).toLabel,"Метро");assert.equal(reverse.stages.at(-2).toLabel,"Проезд");
});

test("fence is one finite closed strip ending on the checkpoint",()=>{
  const ring=fencePolygon().geometry.coordinates[0];
  assert.deepEqual(ring[0],ring.at(-1));assert.ok(ring.flat().every(Number.isFinite));
  assert.deepEqual(fencePoints[0],[37.795089,55.718678]);assert.deepEqual(fencePoints.at(-1),[37.7952931,55.7187348]);
});
