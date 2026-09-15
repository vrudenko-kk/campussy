import test from "node:test";
import assert from "node:assert/strict";
import { wingPlans } from "../dist/js/wing-plans.js";
import { wingDirectory } from "../dist/js/wing-directory.js";
import { getFloorPlan,locationById } from "../dist/js/campus-data.js";
import { getNavigationGraph,buildRoute } from "../dist/js/router.js";

test("directory boards take precedence over generated numbers and old purposes",()=>{
  assert.equal(new Set(wingDirectory.map(r=>r.id)).size,wingDirectory.length);
  for(const id of ["1100","1106","1118","1209","1210","1301","1507","2116","2117","2129","2132","2316","2416","2516","2533"])assert.ok(locationById(id),id);
  assert.match(locationById("1507").purpose,/Психолог/);
  assert.equal(locationById("1517"),undefined);
  assert.match(locationById("2421").purpose,/технической поддержки/);
  assert.equal(locationById("2421").verified,false);
  assert.equal(buildRoute(locationById("3310"),locationById("2421")).status,"unverified");
});

test("all ten wing plans have mirrored walls, doors and corridor nodes",()=>{
  for(const floor of [1,2,3,4,5]){
    const a=getFloorPlan("c1",floor),b=getFloorPlan("c2",floor);
    assert.notEqual(a,getFloorPlan("c1",floor===1?2:1));
    for(const room of a.rooms.filter(r=>r.id!=="cofix")){
      const mirrored=b.rooms.find(r=>r.slot===room.slot);
      assert.deepEqual(mirrored.rect,[a.width-room.rect[0]-room.rect[2],...room.rect.slice(1)]);
      assert.deepEqual(mirrored.door,[a.width-room.door[0],room.door[1]]);
    }
    for(const [key,p]of Object.entries(a.nodes))assert.deepEqual(b.nodes[key],[a.width-p[0],p[1]]);
  }
  assert.equal(getFloorPlan("c1",5).rooms.find(r=>r.id==="1514").doors.length,2);
  assert.ok(getFloorPlan("c2",4).rooms.find(r=>r.id==="2430"));
  assert.ok(getFloorPlan("c2",2).rooms.find(r=>r.id==="2229"));
  assert.deepEqual(getFloorPlan("c1",3).rooms.find(r=>r.id==="1314").rect,getFloorPlan("c1",5).rooms.find(r=>r.id==="1514").rect);
});

test("each wing corridor/door edge avoids unrelated room interiors",()=>{
  const graph=getNavigationGraph();
  for(const [key,plan]of Object.entries(wingPlans)){
    const [area,f]=key.split(":"),floor=Number(f);
    for(const [id,node]of graph.nodes){
      if(node.buildingId!==area||node.floor!==floor)continue;
      for(const edge of graph.edges.get(id)){
        if(edge.kind!=="floor"||edge.from>edge.to)continue;
        const end=graph.nodes.get(edge.to);
        if(end.buildingId!==area||end.floor!==floor)continue;
        const linked=new Set([edge.from,edge.to].map(n=>n.slice(key.length+1).split(":door")[0]));
        const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
        for(const wall of plan.walls)for(let i=1;i<wall.length;i++){
          const [a,b,c,d]=[node.point,end.point,wall[i-1],wall[i]];
          assert.ok(!(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0),`${edge.from} → ${edge.to} crosses internal wall`);
        }
        for(let i=1;i<16;i++){
          const p=node.point.map((v,j)=>v+(end.point[j]-v)*i/16);
          for(const room of plan.rooms){
            if(linked.has(room.id)||room.type==="food")continue;
            const [x,y,w,h]=room.rect;
            assert.ok(!(p[0]>x+.5&&p[0]<x+w-.5&&p[1]>y+.5&&p[1]<y+h-.5),`${key} ${edge.from} → ${edge.to} crosses ${room.id}`);
          }
        }
      }
    }
  }
});
