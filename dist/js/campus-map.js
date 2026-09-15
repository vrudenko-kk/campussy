import { buildingGeoJSON } from "./campus-data.js";

const buildingViews = {
  c1:{bearing:82,zoom:18.45,pitch:58},
  c2:{bearing:-98,zoom:18.45,pitch:58},
  c3:{bearing:180,zoom:18.35,pitch:58},
};

export async function createCampusMap(container,onBuildingSelect,onCheckpointSelect) {
  const maplibregl = await import("https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs");
  const mobile=window.matchMedia("(max-width: 760px)").matches;
  const map = new maplibregl.Map({
    container,
    style:"https://tiles.openfreemap.org/styles/bright",
    center:[37.79559,55.71791],
    zoom:mobile?17.9:18.18,
    pitch:58,
    bearing:180,
    attributionControl:false,
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),"top-left");
  map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
  map.on("styleimagemissing",event => {
    if (!map.hasImage(event.id)) map.addImage(event.id,{width:1,height:1,data:new Uint8Array([0,0,0,0])});
  });

  let selectedId = "c3";
  let hoveredId = null;
  const centers=Object.fromEntries(buildingGeoJSON.features.filter(feature=>["c1","c2","c3"].includes(feature.properties.id)).map(feature=>{
    const points=feature.geometry.coordinates[0]; const center=points.reduce((sum,[lng,lat])=>[sum[0]+lng,sum[1]+lat],[0,0]).map(value=>value/points.length);
    return [feature.properties.id,center];
  }));

  map.on("load",() => {
    // Базовые здания и POI перекрывают нашу точную модель кампуса и дают
    // полупрозрачные «смазанные» грани, поэтому оставляем только дороги и фон.
    const baseBuildingLayers=(map.getStyle().layers??[])
      .filter(layer=>layer["source-layer"]==="building" || /^building(?:-|$)/.test(layer.id))
      .map(layer=>layer.id);
    [...new Set(["poi_r20","poi_r7","poi_r1",...baseBuildingLayers])].forEach(layerId=>{
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId,"visibility","none");
    });
    map.addSource("campus-buildings",{type:"geojson",data:buildingGeoJSON,promoteId:"id"});
    map.addLayer({
      id:"campus-buildings",type:"fill-extrusion",source:"campus-buildings",
      paint:{
        "fill-extrusion-color":["case",
          ["==",["get","id"],"link"],"#8fdcc8",
          ["==",["get","id"],"checkpoint-building"],"#18aa7d",
          ["boolean",["feature-state","selected"],false],"#11b984",
          ["boolean",["feature-state","hovered"],false],"#3b8eea",
          "#5f83aa"],
        "fill-extrusion-height":["+",["get","height"],["case",["boolean",["feature-state","selected"],false],4,["boolean",["feature-state","hovered"],false],2,0]],
        "fill-extrusion-base":0,
        "fill-extrusion-opacity":1,
        "fill-extrusion-vertical-gradient":true,
      },
    });
    map.addLayer({
      id:"campus-outline",type:"line",source:"campus-buildings",
      paint:{
        "line-color":["case",["==",["get","id"],"checkpoint-building"],"#05775a",["boolean",["feature-state","selected"],false],"#05775a",["boolean",["feature-state","hovered"],false],"#145db8","#eaf3fb"],
        "line-width":["case",["boolean",["feature-state","selected"],false],4,["boolean",["feature-state","hovered"],false],3,1.5],
        "line-opacity":1,
      },
    });
    map.addLayer({
      id:"campus-labels",type:"symbol",source:"campus-buildings",
      filter:["match",["get","id"],["c1","c2","c3","checkpoint-building"],true,false],
      layout:{"text-field":["get","name"],"text-size":["case",["==",["get","id"],"checkpoint-building"],11,14],"text-font":["Noto Sans Regular"],"text-offset":["case",["==",["get","id"],"checkpoint-building"],["literal",[0,-.65]],["literal",[0,-1.1]]]},
      paint:{"text-color":["case",["boolean",["feature-state","selected"],false],"#05775a","#0b1d38"],"text-halo-color":"#ffffff","text-halo-width":2.5},
    });
    map.on("mousemove","campus-buildings",event => {
      const id=event.features?.[0]?.properties?.id;
      const interactive=["c1","c2","c3","checkpoint-building"].includes(id);
      map.getCanvas().style.cursor=interactive?"pointer":"";
      if (hoveredId && hoveredId!==id) map.setFeatureState({source:"campus-buildings",id:hoveredId},{hovered:false});
      hoveredId=interactive?id:null;
      if (hoveredId) map.setFeatureState({source:"campus-buildings",id:hoveredId},{hovered:true});
    });
    map.on("mouseleave","campus-buildings",() => {
      map.getCanvas().style.cursor="";
      if (hoveredId) map.setFeatureState({source:"campus-buildings",id:hoveredId},{hovered:false});
      hoveredId=null;
    });
    map.on("click","campus-buildings",event => {
      const feature = event.features?.[0];
      const id=feature?.properties?.id;
      if (["c1","c2","c3"].includes(id)) onBuildingSelect(id);
      if (id==="checkpoint-building") onCheckpointSelect?.();
    });
    if (selectedId) map.setFeatureState({source:"campus-buildings",id:selectedId},{selected:true});
  });

  return {
    map,
    select(id) {
      const previousId=selectedId;
      selectedId=id;
      if (!map.isStyleLoaded() || !map.getSource("campus-buildings")) return;
      if (previousId) map.setFeatureState({source:"campus-buildings",id:previousId},{selected:false});
      if (id) {
        map.setFeatureState({source:"campus-buildings",id},{selected:true});
        if (centers[id]) map.easeTo({center:centers[id],...buildingViews[id],duration:520});
      }
    },
    overview() {
      const previousId=selectedId; selectedId="c3";
      if (map.isStyleLoaded() && map.getSource("campus-buildings")) {
        if (previousId) map.setFeatureState({source:"campus-buildings",id:previousId},{selected:false});
        map.setFeatureState({source:"campus-buildings",id:"c3"},{selected:true});
      }
      map.easeTo({center:[37.79559,55.71791],zoom:mobile?17.9:18.18,pitch:58,bearing:180,duration:520});
    },
    resize() { map.resize(); },
    destroy() { map.remove(); },
  };
}
