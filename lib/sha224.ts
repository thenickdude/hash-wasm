import WASMInterface, { IWASMInterface, IHasher } from './WASMInterface';
import Mutex from './mutex';
import wasmJson from '../wasm/sha256.wasm.json';
import lockedCreate from './lockedCreate';
import { IDataType } from './util';

const mutex = new Mutex();
let wasmCache: IWASMInterface = null;

export function sha224(data: IDataType): Promise<string> {
  if (wasmCache === null) {
    return lockedCreate(mutex, wasmJson, 28)
      .then((wasm) => {
        wasmCache = wasm;
        return wasmCache.calculate(data, 224);
      });
  }

  try {
    const hash = wasmCache.calculate(data, 224);
    return Promise.resolve(hash);
  } catch (err) {
    return Promise.reject(err);
  }
}

export function createSHA224(): Promise<IHasher> {
  return WASMInterface(wasmJson, 28).then((wasm) => {
    wasm.init(224);
    const obj: IHasher = {
      init: () => { wasm.init(224); return obj; },
      update: (data) => { wasm.update(data); return obj; },
      digest: (outputType) => wasm.digest(outputType) as any,
      blockSize: 64,
      digestSize: 28,
    };
    return obj;
  });
}

export default sha224;
