import * as openscadModule from 'openscad-wasm-prebuilt';

let instance: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  if (type === 'INIT') {
    try {
      instance = await openscadModule.createOpenSCAD({
        print: () => { },
        printErr: () => { },
      });
      self.postMessage({ type: 'INIT_DONE' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: String(err), id });
    }
  } else if (type === 'GENERATE') {
    if (!instance) {
      self.postMessage({ type: 'ERROR', payload: 'OpenSCAD engine not initialized', id });
      return;
    }
    try {
      // Run the rendering
      const stl = await instance.renderToStl(payload.scadCode);
      self.postMessage({ type: 'GENERATE_DONE', payload: stl, id });
    } catch (err) {
      self.postMessage({ type: 'ERROR', payload: String(err), id });
    }
  }
};
