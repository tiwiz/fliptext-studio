import { createOpenSCAD } from 'openscad-wasm-prebuilt';

try {
  const instance = await createOpenSCAD({ print: (t) => process.stdout.write("LOG:" + t + "\n"), printErr: (t) => process.stderr.write("ERRLOG:" + t + "\n") });
  const code = `$fn=50;\nlinear_extrude(10) {\n    text("A", size=30, halign="center", valign="center");\n}\n`;
  console.log("CODE:", code);
  const stl = await instance.renderToStl(code);
  console.log("LEN:" + stl?.length);
  if (stl && stl.length > 200) {
    console.log("FACETS:" + (stl.match(/facet normal/g) || []).length);
    console.log("START:" + stl.substring(0, 200));
  } else {
    console.log("EMPTY:", JSON.stringify(stl));
  }
} catch(e) {
  console.error("ERR_MSG:" + e.message);
  console.error("ERR_STACK:" + e.stack);
  console.error("ERR_NAME:" + e.name);
}
