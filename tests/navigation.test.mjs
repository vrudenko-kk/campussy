import test from "node:test";
import assert from "node:assert/strict";
import { allSearchable, floorAreas, getFloorPlan, locationById } from "../dist/js/campus-data.js";
import { buildRoute, getNavigationGraph } from "../dist/js/router.js";
import { roundedPath } from "../dist/js/floor-map.js";

const route=(a,b)=>buildRoute(locationById(a),locationById(b));

test("entrance and checkpoint are distinct from corpus 3",()=>{
  assert.equal(locationById("main-entrance").buildingId,"entry");
  assert.equal(locationById("checkpoint").buildingId,null);
  assert.equal(locationById("buffet").buildingId,"entry");
  assert.equal(locationById("canteen").buildingId,"entry");
  assert.deepEqual(route("checkpoint","main-entrance").stages.map(s=>s.kind),["outdoor"]);
  for(const [a,b]of [["main-entrance","entrance-c3"],["entrance-c3","main-entrance"],["checkpoint","3805"],["3805","checkpoint"]]){
    const result=route(a,b);assert.equal(result.status,"ready");
    assert.ok(result.stages.some(s=>s.kind==="outdoor"&&s.summary.includes("внутренний двор")));
  }
});

test("supplied 8th-floor room arrangement and equipment are retained",()=>{
  const plan=getFloorPlan("c3",8),room=id=>plan.rooms.find(r=>r.id===id);
  assert.deepEqual(plan.rooms.filter(r=>r.type==="room").map(r=>r.id).sort(),["3801","3802","3804","3805","3810","3811"]);
  assert.ok(room("3810").point[0]<room("3811").point[0]);
  assert.ok(room("3810").point[1]<room("3802").point[1]);
  assert.ok(room("3801").point[0]<room("3802").point[0]);
  assert.ok(room("3802").point[0]<room("3804").point[0]);
  assert.ok(room("3804").point[0]<room("3805").point[0]);
  assert.equal(plan.rooms.filter(r=>r.type==="lift").length,4);
  assert.equal(plan.rooms.filter(r=>r.type==="restroom").length,2);
  assert.equal(getFloorPlan("c3",1).rooms.filter(r=>r.type==="lift").length,4);
  assert.equal(locationById("3803").verified,false);
});

test("3310 route starts and ends at 3310 without render-order dependence",()=>{
  const room=getFloorPlan("c3",3).rooms.find(r=>r.id==="3310");
  const forward=route("3310","2421"),reverse=route("2421","3310");
  assert.deepEqual(forward.stages[0].points[0],room.point);
  assert.deepEqual(reverse.stages.at(-1).points.at(-1),room.point);
  const before=JSON.stringify(getFloorPlan("c3",3));
  route("3309","3310");route("3310","3303");
  assert.equal(JSON.stringify(getFloorPlan("c3",3)),before);
});

test("all routable places have a node and no generic room overlaps",()=>{
  const graph=getNavigationGraph();
  for(const location of allSearchable.filter(l=>l.verified)){
    const key=location.graphNode??`${location.buildingId}:${location.floor}:${location.id}`;
    assert.ok(graph.nodes.has(key),key);
  }
  for(const area of floorAreas)for(const floor of area.floors){
    const plan=getFloorPlan(area.id,floor);
    if(plan.image||plan.outline)continue;
    for(let i=0;i<plan.rooms.length;i++)for(let j=i+1;j<plan.rooms.length;j++){
      const a=plan.rooms[i],b=plan.rooms[j];
      const overlap=a.rect[0]<b.rect[0]+b.rect[2]&&a.rect[0]+a.rect[2]>b.rect[0]&&a.rect[1]<b.rect[1]+b.rect[3]&&a.rect[1]+a.rect[3]>b.rect[1];
      assert.ok(!overlap,`${a.id} overlaps ${b.id}`);
    }
  }
});

test("8th-floor room paths do not cross other room interiors",()=>{
  const plan=getFloorPlan("c3",8),ids=plan.rooms.filter(r=>r.type==="room").map(r=>r.id);
  for(const a of ids)for(const b of ids){
    if(a===b)continue;
    const result=route(a,b);assert.equal(result.status,"ready");
    assert.ok(result.stages.every(s=>s.kind==="floor"&&s.floor===8));
    const points=result.stages[0].points;
    for(let i=1;i<points.length;i++)for(let sample=1;sample<20;sample++){
      const point=points[i-1].map((v,j)=>v+(points[i][j]-v)*sample/20);
      for(const room of plan.rooms.filter(r=>r.id!==a&&r.id!==b)){
        const [x,y,w,h]=room.rect;
        assert.ok(!(point[0]>x+1&&point[0]<x+w-1&&point[1]>y+1&&point[1]<y+h-1),`${a} → ${b} cuts through ${room.id}`);
      }
    }
    const d=roundedPath(points);assert.ok(d.startsWith("M "));assert.ok(!/NaN|Infinity/.test(d));
  }
});

test("lift to 8th floor and invalid route states",()=>{
  assert.ok(route("checkpoint","3805").stages.some(s=>s.transport==="lift"&&s.toFloor===8));
  assert.equal(route("3801","3801").status,"same");
  assert.equal(route("3801","3803").status,"unverified");
  assert.equal(buildRoute(null,locationById("3801")).status,"empty");
});
