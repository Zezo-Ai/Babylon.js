/* eslint-disable @typescript-eslint/no-restricted-imports */
/* eslint-disable @typescript-eslint/naming-convention */
// import * as BABYLON from "core/index";
import * as BABYLON from "../../../../dev/core/src/index";
import * as DebugImport from "../../../../dev/core/src/Debug/index";

declare let global: any;

/**
 * Legacy support, defining window.BABYLON (global variable).
 *
 * This is the entry point for the UMD module.
 * The entry point for a future ESM package should be index.ts
 */
const globalObject = typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : undefined;
if (typeof globalObject !== "undefined") {
    globalObject.BABYLON = globalObject.BABYLON || {};
    const BABYLONGLOBAL = globalObject.BABYLON;
    BABYLONGLOBAL.Debug = BABYLONGLOBAL.Debug || {};

    const keys = [];
    for (const key in DebugImport) {
        BABYLONGLOBAL.Debug[key] = (<any>DebugImport)[key];
        keys.push(key);
    }
    for (const key in BABYLON) {
        BABYLONGLOBAL[key] = (<any>BABYLON)[key];
    }
}

export * from "../../../../dev/core/src/index";
export const Debug = {
    AxesViewer: BABYLON.AxesViewer,
    BoneAxesViewer: BABYLON.BoneAxesViewer,
    PhysicsViewer: BABYLON.PhysicsViewer,
    SkeletonViewer: BABYLON.SkeletonViewer,
};
