// Coordinates use [longitude, latitude]. Campus paths and fence remain schematic.
// Metro entrance: OSM node 2885351975, queried 2026-09-15 (exit 1).
export const metroPoint=[37.7937157,55.7176829];
export const streetGate=[37.79498,55.71873];
export const checkpointPoint=[37.7951911,55.7187065];
export const c1EntryPoint=[37.79525,55.71839];
// OSM way 30776932. Its bearing follows the long axis of corpus 1.
export const roadCoordinates=[[37.7951631,55.7191952],[37.7950228,55.7188763],[37.7949653,55.7187421],[37.7946139,55.7179216],[37.7945995,55.7178881],[37.7945722,55.7178244],[37.7943663,55.7173437]];

// One connected strip terminates on opposite corners of the checkpoint.
// The checkpoint itself closes the missing piece of the perimeter.
export const fencePoints=[
  [37.7950890,55.7186780],[37.79473,55.71781],[37.79599,55.71759],
  [37.79650,55.71850],[37.7952931,55.7187348],
];

export function fencePolygon(points=fencePoints,width=.3){
  const sx=63700,sy=111320,origin=points[0];
  const p=points.map(v=>[(v[0]-origin[0])*sx,(v[1]-origin[1])*sy]);
  const normals=p.slice(1).map((b,i)=>{const a=p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);return [-(b[1]-a[1])/length,(b[0]-a[0])/length];});
  const offsets=p.map((_,i)=>{
    const a=normals[Math.max(0,i-1)],b=normals[Math.min(i,normals.length-1)];
    const sum=[a[0]+b[0],a[1]+b[1]],length=Math.hypot(...sum),n=sum.map(v=>v/length);
    const scale=width/2/Math.max(.25,n[0]*b[0]+n[1]*b[1]);return n.map(v=>v*scale);
  });
  const side=sign=>p.map((v,i)=>[origin[0]+(v[0]+sign*offsets[i][0])/sx,origin[1]+(v[1]+sign*offsets[i][1])/sy]);
  const ring=[...side(1),...side(-1).reverse()];ring.push(ring[0]);
  return {type:"Feature",properties:{},geometry:{type:"Polygon",coordinates:[ring]}};
}

export const campusOutdoor={
  checkpoint:[190,95],courtyard:[500,430],c1Entrance:[160,550],streetGate:[60,95],
  road:[[60,25],[60,775]],
  fence:[[140,130],[110,130],[110,760],[925,760],[925,65],[240,65]],
};
