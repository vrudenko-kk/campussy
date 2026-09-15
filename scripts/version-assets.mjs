// Buildless release helper: give all local modules/styles a shared content revision.
// Prevents a browser from combining a new HTML document with a stale floor catalogue.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root=path.resolve(import.meta.dirname,"../dist");
const files=["index.html","styles.css",...fs.readdirSync(path.join(root,"js")).filter(f=>f.endsWith(".js")).sort().map(f=>"js/"+f)];
const normalize=s=>s.replace(/\?v=[a-z0-9-]+(?=["'])/g,"");
const source=new Map(files.map(file=>[file,normalize(fs.readFileSync(path.join(root,file),"utf8"))]));
const revision=createHash("sha256").update([...source].map(([name,s])=>name+s).join("\n")).digest("hex").slice(0,12);
for(const [file,original]of source){
  const versioned=file.endsWith(".js")?original.replace(/(from\s+["']\.\.?\/[^"']+\.js)(["'])/g,`$1?v=${revision}$2`):file==="index.html"?original.replace(/((?:href|src)=["'](?:styles\.css|js\/app\.js))(["'])/g,`$1?v=${revision}$2`):original;
  if(versioned!==fs.readFileSync(path.join(root,file),"utf8"))fs.writeFileSync(path.join(root,file),versioned);
}
console.log("Asset revision: "+revision);
