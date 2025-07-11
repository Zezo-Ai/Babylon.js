import { Constants } from "../Engines/constants";
import type { IStencilState } from "./IStencilState";

/**
 * @internal
 **/
export class StencilState implements IStencilState {
    /** Passed to depthFunction or stencilFunction to specify depth or stencil tests will always pass. i.e. Pixels will be drawn in the order they are drawn */
    public static readonly ALWAYS = Constants.ALWAYS;
    /** Passed to stencilOperation to specify that stencil value must be kept */
    public static readonly KEEP = Constants.KEEP;
    /** Passed to stencilOperation to specify that stencil value must be replaced */
    public static readonly REPLACE = Constants.REPLACE;

    public constructor() {
        this.reset();
    }

    public reset() {
        this.enabled = false;
        this.mask = 0xff;

        this.funcRef = 1;
        this.funcMask = 0xff;

        this.func = StencilState.ALWAYS;
        this.opStencilFail = StencilState.KEEP;
        this.opDepthFail = StencilState.KEEP;
        this.opStencilDepthPass = StencilState.REPLACE;

        this.backFunc = StencilState.ALWAYS;
        this.backOpStencilFail = StencilState.KEEP;
        this.backOpDepthFail = StencilState.KEEP;
        this.backOpStencilDepthPass = StencilState.REPLACE;
    }

    public func: number;
    public get stencilFunc(): number {
        return this.func;
    }

    public set stencilFunc(value: number) {
        this.func = value;
    }

    public backFunc: number;
    public get stencilBackFunc(): number {
        return this.backFunc;
    }

    public set stencilBackFunc(value: number) {
        this.backFunc = value;
    }

    public funcRef: number;
    public get stencilFuncRef(): number {
        return this.funcRef;
    }

    public set stencilFuncRef(value: number) {
        this.funcRef = value;
    }

    public funcMask: number;
    public get stencilFuncMask(): number {
        return this.funcMask;
    }

    public set stencilFuncMask(value: number) {
        this.funcMask = value;
    }

    public opStencilFail: number;
    public get stencilOpStencilFail(): number {
        return this.opStencilFail;
    }

    public set stencilOpStencilFail(value: number) {
        this.opStencilFail = value;
    }

    public opDepthFail: number;
    public get stencilOpDepthFail(): number {
        return this.opDepthFail;
    }

    public set stencilOpDepthFail(value: number) {
        this.opDepthFail = value;
    }

    public opStencilDepthPass: number;
    public get stencilOpStencilDepthPass(): number {
        return this.opStencilDepthPass;
    }

    public set stencilOpStencilDepthPass(value: number) {
        this.opStencilDepthPass = value;
    }

    public backOpStencilFail: number;
    public get stencilBackOpStencilFail(): number {
        return this.backOpStencilFail;
    }

    public set stencilBackOpStencilFail(value: number) {
        this.backOpStencilFail = value;
    }

    public backOpDepthFail: number;
    public get stencilBackOpDepthFail(): number {
        return this.backOpDepthFail;
    }

    public set stencilBackOpDepthFail(value: number) {
        this.backOpDepthFail = value;
    }

    public backOpStencilDepthPass: number;
    public get stencilBackOpStencilDepthPass(): number {
        return this.backOpStencilDepthPass;
    }

    public set stencilBackOpStencilDepthPass(value: number) {
        this.backOpStencilDepthPass = value;
    }

    public mask: number;
    public get stencilMask(): number {
        return this.mask;
    }

    public set stencilMask(value: number) {
        this.mask = value;
    }

    public enabled: boolean;
    public get stencilTest(): boolean {
        return this.enabled;
    }

    public set stencilTest(value: boolean) {
        this.enabled = value;
    }
}
