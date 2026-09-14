import { buildingGeoJSON, campus } from "./campus-data.js";

export async function createCampusMap(container,onBuildingSelect) {
  const maplibregl = await import("https://cdn.jsdelivr.net/npm/maplibre-gl@6.9.0/dist/maplibre-gl.mjs");
  const map = new maplibregl.Map({
    container,
    style:"https://tiles.openfreemap.org/styles/bright",
    center:campus.center,
    zoom:18.15,
    pitch:57,
    bearing:-22,
    attributionControl:false,
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),"top-left");
  map.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
  map.on("styleimagemissing",event => {
    if (!map.hasImage(event.id)) map.addImage(event.id,{width:1,height:1,data:new Uint8Array([0,0,0,0])});
  });

  let selectedId = null;

  map.on("load",() => {
    map.addSource("campus-buildings",{type:"geojson",data:buildingGeoJSON,promoteId:"id"});
    map.addLayer({
      id:"campus-buildings-shadow",type:"fill-extrusion",source:"campus-buildings",
      paint:{"fill-extrusion-color":"#0b1830","fill-extrusion-height":["get","height"],"fill-extrusion-base":0,"fill-extrusion-opacity":0.28,"fill-extrusion-translate":[7,10]},
    });
    map.addLayer({
      id:"campus-buildings",type:"fill-extrusion",source:"campus-buildings",
      paint:{
        "fill-extrusion-color":["case",["boolean",["feature-state","selected"],false],"#20b486",["get","color"]],
        "fill-extrusion-height":["get","height"],"fill-extrusion-base":0,"fill-extrusion-opacity":0.96,
      },
    });
    map.addLayer({
      id:"campus-outline",type:"line",source:"campus-buildings",
      paint:{"line-color":"#ffffff","line-width":2,"line-opacity":0.9},
    });
    map.addLayer({
      id:"campus-labels",type:"symbol",source:"campus-buildings",
      filter:["!=",["get","id"],"link"],
      layout:{"text-field":["get","name"],"text-size":14,"text-font":["Noto Sans Regular"],"text-offset":[0,-1.1]},
      paint:{"text-color":"#0b1d38","text-halo-color":"#ffffff","text-halo-width":2},
    });
    map.on("mouseenter","campus-buildings",() => { map.getCanvas().style.cursor="pointer"; });
    map.on("mouseleave","campus-buildings",() => { map.getCanvas().style.cursor=""; });
    map.on("click","campus-buildings",event => {
      const feature = event.features?.[0];
      if (feature?.properties?.id && feature.properties.id !== "link") onBuildingSelect(feature.properties.id);
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
      if (id) map.setFeatureState({source:"campus-buildings",id},{selected:true});
    },
    resize() { map.resize(); },
    destroy() { map.remove(); },
  };
}
