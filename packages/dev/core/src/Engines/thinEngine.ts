/* eslint-disable @typescript-eslint/no-unused-vars */
import type { IEffectCreationOptions, IShaderPath } from "../Materials/effect";
import type { _IShaderProcessingContext } from "./Processors/shaderProcessingOptions";
import type { Nullable, DataArray, IndicesArray, FloatArray, DeepImmutable } from "../types";
import type { IColor4Like } from "../Maths/math.like";
import type { DataBuffer } from "../Buffers/dataBuffer";
import type { IPipelineContext } from "./IPipelineContext";
import type { WebGLPipelineContext } from "./WebGL/webGLPipelineContext";
import type { VertexBuffer } from "../Buffers/buffer";
import type { InstancingAttributeInfo } from "./instancingAttributeInfo";
import type { ThinTexture } from "../Materials/Textures/thinTexture";
import type { IEffectFallbacks } from "../Materials/iEffectFallbacks";
import type { IHardwareTextureWrapper } from "../Materials/Textures/hardwareTextureWrapper";
import type { DrawWrapper } from "../Materials/drawWrapper";
import type { IMaterialContext } from "./IMaterialContext";
import type { IDrawContext } from "./IDrawContext";
import type { ICanvas, ICanvasRenderingContext } from "./ICanvas";
import type { IStencilState } from "../States/IStencilState";
import type { InternalTextureCreationOptions, TextureSize } from "../Materials/Textures/textureCreationOptions";
import type { RenderTargetWrapper } from "./renderTargetWrapper";
import type { WebGLRenderTargetWrapper } from "./WebGL/webGLRenderTargetWrapper";
import type { VideoTexture } from "../Materials/Textures/videoTexture";
import type { RenderTargetTexture } from "../Materials/Textures/renderTargetTexture";
import {
    createPipelineContext,
    createRawShaderProgram,
    createShaderProgram,
    _finalizePipelineContext,
    _preparePipelineContext,
    _setProgram,
    _executeWhenRenderingStateIsCompiled,
    getStateObject,
    _createShaderProgram,
    deleteStateObject,
    _isRenderingStateCompiled,
} from "./thinEngine.functions";

import type { AbstractEngineOptions, ISceneLike, PrepareTextureFunction, PrepareTextureProcessFunction } from "./abstractEngine";
import type { PerformanceMonitor } from "../Misc/performanceMonitor";
import { IsWrapper } from "../Materials/drawWrapper.functions";
import { Logger } from "../Misc/logger";
import { IsWindowObjectExist } from "../Misc/domManagement";
import { WebGLShaderProcessor } from "./WebGL/webGLShaderProcessors";
import { WebGL2ShaderProcessor } from "./WebGL/webGL2ShaderProcessors";
import { WebGLDataBuffer } from "../Meshes/WebGL/webGLDataBuffer";
import { GetExponentOfTwo } from "../Misc/tools.functions";
import { AbstractEngine } from "./abstractEngine";
import { Constants } from "./constants";
import { WebGLHardwareTexture } from "./WebGL/webGLHardwareTexture";
import { ShaderLanguage } from "../Materials/shaderLanguage";
import { InternalTexture, InternalTextureSource } from "../Materials/Textures/internalTexture";
import { Effect } from "../Materials/effect";
import { _ConcatenateShader, _GetGlobalDefines } from "./abstractEngine.functions";
import { resetCachedPipeline } from "core/Materials/effect.functions";
import { HasStencilAspect, IsDepthTexture } from "core/Materials/Textures/textureHelper.functions";

/**
 * Keeps track of all the buffer info used in engine.
 */
class BufferPointer {
    public active: boolean;
    public index: number;
    public size: number;
    public type: number;
    public normalized: boolean;
    public stride: number;
    public offset: number;
    public buffer: WebGLBuffer;
}

/** Interface defining initialization parameters for Engine class */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface EngineOptions extends AbstractEngineOptions, WebGLContextAttributes {
    /**
     * Defines if webgl2 should be turned off even if supported
     * @see https://doc.babylonjs.com/setup/support/webGL2
     */
    disableWebGL2Support?: boolean;

    /**
     * Defines that engine should compile shaders with high precision floats (if supported). True by default
     */
    useHighPrecisionFloats?: boolean;
    /**
     * Make the canvas XR Compatible for XR sessions
     */
    xrCompatible?: boolean;

    /**
     * Will prevent the system from falling back to software implementation if a hardware device cannot be created
     */
    failIfMajorPerformanceCaveat?: boolean;

    /**
     * If sRGB Buffer support is not set during construction, use this value to force a specific state
     * This is added due to an issue when processing textures in chrome/edge/firefox
     * This will not influence NativeEngine and WebGPUEngine which set the behavior to true during construction.
     */
    forceSRGBBufferSupportState?: boolean;

    /**
     * Defines if the gl context should be released.
     * It's false by default for backward compatibility, but you should probably pass true (see https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/)
     */
    loseContextOnDispose?: boolean;
}

/**
 * The base engine class (root of all engines)
 */
export class ThinEngine extends AbstractEngine {
    private static _TempClearColorUint32 = new Uint32Array(4);
    private static _TempClearColorInt32 = new Int32Array(4);

    /** Use this array to turn off some WebGL2 features on known buggy browsers version */
    public static ExceptionList = [
        { key: "Chrome/63.0", capture: "63\\.0\\.3239\\.(\\d+)", captureConstraint: 108, targets: ["uniformBuffer"] },
        { key: "Firefox/58", capture: null, captureConstraint: null, targets: ["uniformBuffer"] },
        { key: "Firefox/59", capture: null, captureConstraint: null, targets: ["uniformBuffer"] },
        { key: "Chrome/72.+?Mobile", capture: null, captureConstraint: null, targets: ["vao"] },
        { key: "Chrome/73.+?Mobile", capture: null, captureConstraint: null, targets: ["vao"] },
        { key: "Chrome/74.+?Mobile", capture: null, captureConstraint: null, targets: ["vao"] },
        { key: "Mac OS.+Chrome/71", capture: null, captureConstraint: null, targets: ["vao"] },
        { key: "Mac OS.+Chrome/72", capture: null, captureConstraint: null, targets: ["vao"] },
        { key: "Mac OS.+Chrome", capture: null, captureConstraint: null, targets: ["uniformBuffer"] },
        { key: "Chrome/12\\d\\..+?Mobile", capture: null, captureConstraint: null, targets: ["uniformBuffer"] },
        // desktop osx safari 15.4
        { key: ".*AppleWebKit.*(15.4).*Safari", capture: null, captureConstraint: null, targets: ["antialias", "maxMSAASamples"] },
        // mobile browsers using safari 15.4 on ios
        { key: ".*(15.4).*AppleWebKit.*Safari", capture: null, captureConstraint: null, targets: ["antialias", "maxMSAASamples"] },
    ];

    /** @internal */
    protected override _name = "WebGL";

    /**
     * Gets or sets the name of the engine
     */
    public override get name(): string {
        return this._name;
    }

    public override set name(value: string) {
        this._name = value;
    }

    /**
     * Returns the version of the engine
     */
    public get version(): number {
        return this._webGLVersion;
    }

    /**
     * Gets or sets the relative url used to load shaders if using the engine in non-minified mode
     */
    public static get ShadersRepository(): string {
        return Effect.ShadersRepository;
    }
    public static set ShadersRepository(value: string) {
        Effect.ShadersRepository = value;
    }

    /**
     * Gets or sets a boolean that indicates if textures must be forced to power of 2 size even if not required
     */
    public forcePOTTextures = false;

    /** Gets or sets a boolean indicating if the engine should validate programs after compilation */
    public validateShaderPrograms = false;

    /**
     * Gets or sets a boolean indicating that uniform buffers must be disabled even if they are supported
     */
    public disableUniformBuffers = false;

    /**
     * Gets a boolean indicating that the engine supports uniform buffers
     * @see https://doc.babylonjs.com/setup/support/webGL2#uniform-buffer-objets
     */
    public get supportsUniformBuffers(): boolean {
        return this.webGLVersion > 1 && !this.disableUniformBuffers;
    }

    // Private Members

    /** @internal */
    public _gl: WebGL2RenderingContext;
    /** @internal */
    public _webGLVersion = 1.0;

    /** @internal */
    public _glSRGBExtensionValues: {
        SRGB: typeof WebGL2RenderingContext.SRGB;
        SRGB8: typeof WebGL2RenderingContext.SRGB8 | EXT_sRGB["SRGB_ALPHA_EXT"];
        SRGB8_ALPHA8: typeof WebGL2RenderingContext.SRGB8_ALPHA8 | EXT_sRGB["SRGB_ALPHA_EXT"];
    };

    /**
     * Gets a boolean indicating that only power of 2 textures are supported
     * Please note that you can still use non power of 2 textures but in this case the engine will forcefully convert them
     */
    public get needPOTTextures(): boolean {
        return this._webGLVersion < 2 || this.forcePOTTextures;
    }

    private _glVersion: string;
    private _glRenderer: string;
    private _glVendor: string;

    // Cache

    /** @internal */
    protected _currentProgram: Nullable<WebGLProgram>;
    private _vertexAttribArraysEnabled: boolean[] = [];
    private _cachedVertexArrayObject: Nullable<WebGLVertexArrayObject>;

    private _uintIndicesCurrentlySet = false;
    protected _currentBoundBuffer = new Array<Nullable<DataBuffer>>();
    /** @internal */
    public _currentFramebuffer: Nullable<WebGLFramebuffer> = null;
    /** @internal */
    public _dummyFramebuffer: Nullable<WebGLFramebuffer> = null;
    private _currentBufferPointers = new Array<BufferPointer>();
    private _currentInstanceLocations = new Array<number>();
    private _currentInstanceBuffers = new Array<DataBuffer>();
    private _textureUnits: Int32Array;

    /** @internal */
    public _workingCanvas: Nullable<ICanvas>;
    /** @internal */
    public _workingContext: Nullable<ICanvasRenderingContext>;

    private _vaoRecordInProgress = false;
    private _mustWipeVertexAttributes = false;

    private _nextFreeTextureSlots = new Array<number>();
    private _maxSimultaneousTextures = 0;
    private _maxMSAASamplesOverride: Nullable<number> = null;

    protected get _supportsHardwareTextureRescaling() {
        return false;
    }

    protected _framebufferDimensionsObject: Nullable<{ framebufferWidth: number; framebufferHeight: number }>;

    /**
     * sets the object from which width and height will be taken from when getting render width and height
     * Will fallback to the gl object
     * @param dimensions the framebuffer width and height that will be used.
     */
    public set framebufferDimensionsObject(dimensions: Nullable<{ framebufferWidth: number; framebufferHeight: number }>) {
        this._framebufferDimensionsObject = dimensions;
    }

    /**
     * Creates a new snapshot at the next frame using the current snapshotRenderingMode
     */
    public snapshotRenderingReset(): void {
        this.snapshotRendering = false;
    }

    /**
     * Creates a new engine
     * @param canvasOrContext defines the canvas or WebGL context to use for rendering. If you provide a WebGL context, Babylon.js will not hook events on the canvas (like pointers, keyboards, etc...) so no event observables will be available. This is mostly used when Babylon.js is used as a plugin on a system which already used the WebGL context
     * @param antialias defines whether anti-aliasing should be enabled (default value is "undefined", meaning that the browser may or may not enable it)
     * @param options defines further options to be sent to the getContext() function
     * @param adaptToDeviceRatio defines whether to adapt to the device's viewport characteristics (default: false)
     */
    constructor(
        canvasOrContext: Nullable<HTMLCanvasElement | OffscreenCanvas | WebGLRenderingContext | WebGL2RenderingContext>,
        antialias?: boolean,
        options?: EngineOptions,
        adaptToDeviceRatio?: boolean
    ) {
        options = options || {};
        super(antialias ?? options.antialias, options, adaptToDeviceRatio);

        if (!canvasOrContext) {
            return;
        }

        let canvas: Nullable<HTMLCanvasElement> = null;
        if ((canvasOrContext as any).getContext) {
            canvas = <HTMLCanvasElement>canvasOrContext;

            if (options.preserveDrawingBuffer === undefined) {
                options.preserveDrawingBuffer = false;
            }

            if (options.xrCompatible === undefined) {
                options.xrCompatible = false;
            }

            // Exceptions
            if (navigator && navigator.userAgent) {
                this._setupMobileChecks();

                const ua = navigator.userAgent;
                for (const exception of ThinEngine.ExceptionList) {
                    const key = exception.key;
                    const targets = exception.targets;
                    const check = new RegExp(key);

                    if (check.test(ua)) {
                        if (exception.capture && exception.captureConstraint) {
                            const capture = exception.capture;
                            const constraint = exception.captureConstraint;

                            const regex = new RegExp(capture);
                            const matches = regex.exec(ua);

                            if (matches && matches.length > 0) {
                                const capturedValue = parseInt(matches[matches.length - 1]);
                                if (capturedValue >= constraint) {
                                    continue;
                                }
                            }
                        }

                        for (const target of targets) {
                            switch (target) {
                                case "uniformBuffer":
                                    this.disableUniformBuffers = true;
                                    break;
                                case "vao":
                                    this.disableVertexArrayObjects = true;
                                    break;
                                case "antialias":
                                    options.antialias = false;
                                    break;
                                case "maxMSAASamples":
                                    this._maxMSAASamplesOverride = 1;
                                    break;
                            }
                        }
                    }
                }
            }

            // Context lost
            if (!this._doNotHandleContextLost) {
                this._onContextLost = (evt: Event) => {
                    evt.preventDefault();
                    this._contextWasLost = true;
                    deleteStateObject(this._gl);
                    Logger.Warn("WebGL context lost.");

                    this.onContextLostObservable.notifyObservers(this);
                };

                this._onContextRestored = () => {
                    this._restoreEngineAfterContextLost(() => this._initGLContext());
                };

                canvas.addEventListener("webglcontextrestored", this._onContextRestored, false);

                options.powerPreference = options.powerPreference || "high-performance";
            } else {
                this._onContextLost = () => {
                    deleteStateObject(this._gl);
                };
            }

            canvas.addEventListener("webglcontextlost", this._onContextLost, false);

            if (this._badDesktopOS) {
                options.xrCompatible = false;
            }

            // GL
            if (!options.disableWebGL2Support) {
                try {
                    this._gl = <any>(canvas.getContext("webgl2", options) || canvas.getContext("experimental-webgl2", options));
                    if (this._gl) {
                        this._webGLVersion = 2.0;
                        this._shaderPlatformName = "WEBGL2";

                        // Prevent weird browsers to lie (yeah that happens!)
                        if (!this._gl.deleteQuery) {
                            this._webGLVersion = 1.0;
                            this._shaderPlatformName = "WEBGL1";
                        }
                    }
                } catch (e) {
                    // Do nothing
                }
            }

            if (!this._gl) {
                if (!canvas) {
                    throw new Error("The provided canvas is null or undefined.");
                }
                try {
                    this._gl = <WebGL2RenderingContext>(canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options));
                } catch (e) {
                    throw new Error("WebGL not supported");
                }
            }

            if (!this._gl) {
                throw new Error("WebGL not supported");
            }
        } else {
            this._gl = <WebGL2RenderingContext>canvasOrContext;
            canvas = this._gl.canvas as HTMLCanvasElement;

            if ((this._gl as any).renderbufferStorageMultisample) {
                this._webGLVersion = 2.0;
                this._shaderPlatformName = "WEBGL2";
            } else {
                this._shaderPlatformName = "WEBGL1";
            }

            const attributes = this._gl.getContextAttributes();
            if (attributes) {
                options.stencil = attributes.stencil;
            }
        }

        this._sharedInit(canvas);

        // Ensures a consistent color space unpacking of textures cross browser.
        this._gl.pixelStorei(this._gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, this._gl.NONE);

        if (options.useHighPrecisionFloats !== undefined) {
            this._highPrecisionShadersAllowed = options.useHighPrecisionFloats;
        }

        this.resize();

        this._initGLContext();
        this._initFeatures();

        // Prepare buffer pointers
        for (let i = 0; i < this._caps.maxVertexAttribs; i++) {
            this._currentBufferPointers[i] = new BufferPointer();
        }

        // Shader processor
        this._shaderProcessor = this.webGLVersion > 1 ? new WebGL2ShaderProcessor() : new WebGLShaderProcessor();

        // Starting with iOS 14, we can trust the browser
        // let matches = navigator.userAgent.match(/Version\/(\d+)/);

        // if (matches && matches.length === 2) {
        //     if (parseInt(matches[1]) >= 14) {
        //         this._badOS = false;
        //     }
        // }

        const versionToLog = `Babylon.js v${ThinEngine.Version}`;
        Logger.Log(versionToLog + ` - ${this.description}`);

        // Check setAttribute in case of workers
        if (this._renderingCanvas && this._renderingCanvas.setAttribute) {
            this._renderingCanvas.setAttribute("data-engine", versionToLog);
        }
        const stateObject = getStateObject(this._gl);
        // update state object with the current engine state
        stateObject.validateShaderPrograms = this.validateShaderPrograms;
        stateObject.parallelShaderCompile = this._caps.parallelShaderCompile;
    }

    protected override _clearEmptyResources(): void {
        this._dummyFramebuffer = null;
        super._clearEmptyResources();
    }

    /**
     * @internal
     */
    public _getShaderProcessingContext(shaderLanguage: ShaderLanguage): Nullable<_IShaderProcessingContext> {
        return null;
    }

    /**
     * Gets a boolean indicating if all created effects are ready
     * @returns true if all effects are ready
     */
    public areAllEffectsReady(): boolean {
        for (const key in this._compiledEffects) {
            const effect = this._compiledEffects[key];

            if (!effect.isReady()) {
                return false;
            }
        }

        return true;
    }

    protected _initGLContext(): void {
        // Caps
        this._caps = {
            maxTexturesImageUnits: this._gl.getParameter(this._gl.MAX_TEXTURE_IMAGE_UNITS),
            maxCombinedTexturesImageUnits: this._gl.getParameter(this._gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
            maxVertexTextureImageUnits: this._gl.getParameter(this._gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
            maxTextureSize: this._gl.getParameter(this._gl.MAX_TEXTURE_SIZE),
            maxSamples: this._webGLVersion > 1 ? this._gl.getParameter(this._gl.MAX_SAMPLES) : 1,
            maxCubemapTextureSize: this._gl.getParameter(this._gl.MAX_CUBE_MAP_TEXTURE_SIZE),
            maxRenderTextureSize: this._gl.getParameter(this._gl.MAX_RENDERBUFFER_SIZE),
            maxVertexAttribs: this._gl.getParameter(this._gl.MAX_VERTEX_ATTRIBS),
            maxVaryingVectors: this._gl.getParameter(this._gl.MAX_VARYING_VECTORS),
            maxFragmentUniformVectors: this._gl.getParameter(this._gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            maxVertexUniformVectors: this._gl.getParameter(this._gl.MAX_VERTEX_UNIFORM_VECTORS),
            parallelShaderCompile: this._gl.getExtension("KHR_parallel_shader_compile") || undefined,
            standardDerivatives: this._webGLVersion > 1 || this._gl.getExtension("OES_standard_derivatives") !== null,
            maxAnisotropy: 1,
            astc: this._gl.getExtension("WEBGL_compressed_texture_astc") || this._gl.getExtension("WEBKIT_WEBGL_compressed_texture_astc"),
            bptc: this._gl.getExtension("EXT_texture_compression_bptc") || this._gl.getExtension("WEBKIT_EXT_texture_compression_bptc"),
            s3tc: this._gl.getExtension("WEBGL_compressed_texture_s3tc") || this._gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc"),
            // eslint-disable-next-line @typescript-eslint/naming-convention
            s3tc_srgb: this._gl.getExtension("WEBGL_compressed_texture_s3tc_srgb") || this._gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc_srgb"),
            pvrtc: this._gl.getExtension("WEBGL_compressed_texture_pvrtc") || this._gl.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc"),
            etc1: this._gl.getExtension("WEBGL_compressed_texture_etc1") || this._gl.getExtension("WEBKIT_WEBGL_compressed_texture_etc1"),
            etc2:
                this._gl.getExtension("WEBGL_compressed_texture_etc") ||
                this._gl.getExtension("WEBKIT_WEBGL_compressed_texture_etc") ||
                this._gl.getExtension("WEBGL_compressed_texture_es3_0"), // also a requirement of OpenGL ES 3
            textureAnisotropicFilterExtension:
                this._gl.getExtension("EXT_texture_filter_anisotropic") ||
                this._gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
                this._gl.getExtension("MOZ_EXT_texture_filter_anisotropic"),
            uintIndices: this._webGLVersion > 1 || this._gl.getExtension("OES_element_index_uint") !== null,
            fragmentDepthSupported: this._webGLVersion > 1 || this._gl.getExtension("EXT_frag_depth") !== null,
            highPrecisionShaderSupported: false,
            timerQuery: this._gl.getExtension("EXT_disjoint_timer_query_webgl2") || this._gl.getExtension("EXT_disjoint_timer_query"),
            supportOcclusionQuery: this._webGLVersion > 1,
            canUseTimestampForTimerQuery: false,
            drawBuffersExtension: false,
            maxMSAASamples: 1,
            colorBufferFloat: !!(this._webGLVersion > 1 && this._gl.getExtension("EXT_color_buffer_float")),
            supportFloatTexturesResolve: false,
            rg11b10ufColorRenderable: false,
            colorBufferHalfFloat: !!(this._webGLVersion > 1 && this._gl.getExtension("EXT_color_buffer_half_float")),
            textureFloat: this._webGLVersion > 1 || this._gl.getExtension("OES_texture_float") ? true : false,
            textureHalfFloat: this._webGLVersion > 1 || this._gl.getExtension("OES_texture_half_float") ? true : false,
            textureHalfFloatRender: false,
            textureFloatLinearFiltering: false,
            textureFloatRender: false,
            textureHalfFloatLinearFiltering: false,
            vertexArrayObject: false,
            instancedArrays: false,
            textureLOD: this._webGLVersion > 1 || this._gl.getExtension("EXT_shader_texture_lod") ? true : false,
            texelFetch: this._webGLVersion !== 1,
            blendMinMax: false,
            multiview: this._gl.getExtension("OVR_multiview2"),
            oculusMultiview: this._gl.getExtension("OCULUS_multiview"),
            depthTextureExtension: false,
            canUseGLInstanceID: this._webGLVersion > 1,
            canUseGLVertexID: this._webGLVersion > 1,
            supportComputeShaders: false,
            supportSRGBBuffers: false,
            supportTransformFeedbacks: this._webGLVersion > 1,
            textureMaxLevel: this._webGLVersion > 1,
            texture2DArrayMaxLayerCount: this._webGLVersion > 1 ? this._gl.getParameter(this._gl.MAX_ARRAY_TEXTURE_LAYERS) : 128,
            disableMorphTargetTexture: false,
            textureNorm16: this._gl.getExtension("EXT_texture_norm16") ? true : false,
            blendParametersPerTarget: false,
            dualSourceBlending: false,
        };

        this._caps.supportFloatTexturesResolve = this._caps.colorBufferFloat;
        this._caps.rg11b10ufColorRenderable = this._caps.colorBufferFloat;

        // Infos
        this._glVersion = this._gl.getParameter(this._gl.VERSION);

        const rendererInfo: any = this._gl.getExtension("WEBGL_debug_renderer_info");
        if (rendererInfo != null) {
            this._glRenderer = this._gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL);
            this._glVendor = this._gl.getParameter(rendererInfo.UNMASKED_VENDOR_WEBGL);
        }

        if (!this._glVendor) {
            this._glVendor = this._gl.getParameter(this._gl.VENDOR) || "Unknown vendor";
        }

        if (!this._glRenderer) {
            this._glRenderer = this._gl.getParameter(this._gl.RENDERER) || "Unknown renderer";
        }

        // Constants
        if (this._gl.HALF_FLOAT_OES !== 0x8d61) {
            this._gl.HALF_FLOAT_OES = 0x8d61; // Half floating-point type (16-bit).
        }
        if (this._gl.RGBA16F !== 0x881a) {
            this._gl.RGBA16F = 0x881a; // RGBA 16-bit floating-point color-renderable internal sized format.
        }
        if (this._gl.RGBA32F !== 0x8814) {
            this._gl.RGBA32F = 0x8814; // RGBA 32-bit floating-point color-renderable internal sized format.
        }
        if (this._gl.DEPTH24_STENCIL8 !== 35056) {
            this._gl.DEPTH24_STENCIL8 = 35056;
        }

        // Extensions
        if (this._caps.timerQuery) {
            if (this._webGLVersion === 1) {
                this._gl.getQuery = (<any>this._caps.timerQuery).getQueryEXT.bind(this._caps.timerQuery);
            }
            // WebGLQuery casted to number to avoid TS error
            this._caps.canUseTimestampForTimerQuery = ((this._gl.getQuery(this._caps.timerQuery.TIMESTAMP_EXT, this._caps.timerQuery.QUERY_COUNTER_BITS_EXT) as number) ?? 0) > 0;
        }

        this._caps.maxAnisotropy = this._caps.textureAnisotropicFilterExtension
            ? this._gl.getParameter(this._caps.textureAnisotropicFilterExtension.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
            : 0;
        this._caps.textureFloatLinearFiltering = this._caps.textureFloat && this._gl.getExtension("OES_texture_float_linear") ? true : false;
        this._caps.textureFloatRender = this._caps.textureFloat && this._canRenderToFloatFramebuffer() ? true : false;
        this._caps.textureHalfFloatLinearFiltering =
            this._webGLVersion > 1 || (this._caps.textureHalfFloat && this._gl.getExtension("OES_texture_half_float_linear")) ? true : false;

        if (this._caps.textureNorm16) {
            this._gl.R16_EXT = 0x822a;
            this._gl.RG16_EXT = 0x822c;
            this._gl.RGB16_EXT = 0x8054;
            this._gl.RGBA16_EXT = 0x805b;
            this._gl.R16_SNORM_EXT = 0x8f98;
            this._gl.RG16_SNORM_EXT = 0x8f99;
            this._gl.RGB16_SNORM_EXT = 0x8f9a;
            this._gl.RGBA16_SNORM_EXT = 0x8f9b;
        }

        const oesDrawBuffersIndexed = this._gl.getExtension("OES_draw_buffers_indexed");
        this._caps.blendParametersPerTarget = oesDrawBuffersIndexed ? true : false;

        if (oesDrawBuffersIndexed) {
            this._gl.blendEquationSeparateIndexed = oesDrawBuffersIndexed.blendEquationSeparateiOES.bind(oesDrawBuffersIndexed);
            this._gl.blendEquationIndexed = oesDrawBuffersIndexed.blendEquationiOES.bind(oesDrawBuffersIndexed);
            this._gl.blendFuncSeparateIndexed = oesDrawBuffersIndexed.blendFuncSeparateiOES.bind(oesDrawBuffersIndexed);
            this._gl.blendFuncIndexed = oesDrawBuffersIndexed.blendFunciOES.bind(oesDrawBuffersIndexed);
            this._gl.colorMaskIndexed = oesDrawBuffersIndexed.colorMaskiOES.bind(oesDrawBuffersIndexed);
            this._gl.disableIndexed = oesDrawBuffersIndexed.disableiOES.bind(oesDrawBuffersIndexed);
            this._gl.enableIndexed = oesDrawBuffersIndexed.enableiOES.bind(oesDrawBuffersIndexed);
        }

        this._caps.dualSourceBlending = this._gl.getExtension("WEBGL_blend_func_extended") ? true : false;

        // Compressed formats
        if (this._caps.astc) {
            this._gl.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR = this._caps.astc.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR;
        }
        if (this._caps.bptc) {
            this._gl.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT = this._caps.bptc.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT;
        }
        if (this._caps.s3tc_srgb) {
            this._gl.COMPRESSED_SRGB_S3TC_DXT1_EXT = this._caps.s3tc_srgb.COMPRESSED_SRGB_S3TC_DXT1_EXT;
            this._gl.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT = this._caps.s3tc_srgb.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
            this._gl.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT = this._caps.s3tc_srgb.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
        }
        if (this._caps.etc2) {
            this._gl.COMPRESSED_SRGB8_ETC2 = this._caps.etc2.COMPRESSED_SRGB8_ETC2;
            this._gl.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC = this._caps.etc2.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC;
        }

        // Checks if some of the format renders first to allow the use of webgl inspector.
        if (this._webGLVersion > 1) {
            if (this._gl.HALF_FLOAT_OES !== 0x140b) {
                this._gl.HALF_FLOAT_OES = 0x140b;
            }
        }
        this._caps.textureHalfFloatRender = this._caps.textureHalfFloat && this._canRenderToHalfFloatFramebuffer();
        // Draw buffers
        if (this._webGLVersion > 1) {
            this._caps.drawBuffersExtension = true;
            this._caps.maxMSAASamples = this._maxMSAASamplesOverride !== null ? this._maxMSAASamplesOverride : this._gl.getParameter(this._gl.MAX_SAMPLES);
            this._caps.maxDrawBuffers = this._gl.getParameter(this._gl.MAX_DRAW_BUFFERS);
        } else {
            const drawBuffersExtension = this._gl.getExtension("WEBGL_draw_buffers");

            if (drawBuffersExtension !== null) {
                this._caps.drawBuffersExtension = true;
                this._gl.drawBuffers = drawBuffersExtension.drawBuffersWEBGL.bind(drawBuffersExtension);
                this._caps.maxDrawBuffers = this._gl.getParameter(drawBuffersExtension.MAX_DRAW_BUFFERS_WEBGL);
                (this._gl.DRAW_FRAMEBUFFER as any) = this._gl.FRAMEBUFFER;

                for (let i = 0; i < 16; i++) {
                    (<any>this._gl)["COLOR_ATTACHMENT" + i + "_WEBGL"] = (<any>drawBuffersExtension)["COLOR_ATTACHMENT" + i + "_WEBGL"];
                }
            }
        }

        // Depth Texture
        if (this._webGLVersion > 1) {
            this._caps.depthTextureExtension = true;
        } else {
            const depthTextureExtension = this._gl.getExtension("WEBGL_depth_texture");

            if (depthTextureExtension != null) {
                this._caps.depthTextureExtension = true;
                this._gl.UNSIGNED_INT_24_8 = depthTextureExtension.UNSIGNED_INT_24_8_WEBGL;
            }
        }

        // Vertex array object
        if (this.disableVertexArrayObjects) {
            this._caps.vertexArrayObject = false;
        } else if (this._webGLVersion > 1) {
            this._caps.vertexArrayObject = true;
        } else {
            const vertexArrayObjectExtension = this._gl.getExtension("OES_vertex_array_object");

            if (vertexArrayObjectExtension != null) {
                this._caps.vertexArrayObject = true;
                this._gl.createVertexArray = vertexArrayObjectExtension.createVertexArrayOES.bind(vertexArrayObjectExtension);
                this._gl.bindVertexArray = vertexArrayObjectExtension.bindVertexArrayOES.bind(vertexArrayObjectExtension);
                this._gl.deleteVertexArray = vertexArrayObjectExtension.deleteVertexArrayOES.bind(vertexArrayObjectExtension);
            }
        }

        // Instances count
        if (this._webGLVersion > 1) {
            this._caps.instancedArrays = true;
        } else {
            const instanceExtension = <ANGLE_instanced_arrays>this._gl.getExtension("ANGLE_instanced_arrays");

            if (instanceExtension != null) {
                this._caps.instancedArrays = true;
                this._gl.drawArraysInstanced = instanceExtension.drawArraysInstancedANGLE.bind(instanceExtension);
                this._gl.drawElementsInstanced = instanceExtension.drawElementsInstancedANGLE.bind(instanceExtension);
                this._gl.vertexAttribDivisor = instanceExtension.vertexAttribDivisorANGLE.bind(instanceExtension);
            } else {
                this._caps.instancedArrays = false;
            }
        }

        if (this._gl.getShaderPrecisionFormat) {
            const vertexhighp = this._gl.getShaderPrecisionFormat(this._gl.VERTEX_SHADER, this._gl.HIGH_FLOAT);
            const fragmenthighp = this._gl.getShaderPrecisionFormat(this._gl.FRAGMENT_SHADER, this._gl.HIGH_FLOAT);

            if (vertexhighp && fragmenthighp) {
                this._caps.highPrecisionShaderSupported = vertexhighp.precision !== 0 && fragmenthighp.precision !== 0;
            }
        }

        if (this._webGLVersion > 1) {
            this._caps.blendMinMax = true;
        } else {
            const blendMinMaxExtension = this._gl.getExtension("EXT_blend_minmax");
            if (blendMinMaxExtension != null) {
                this._caps.blendMinMax = true;
                this._gl.MAX = blendMinMaxExtension.MAX_EXT as typeof WebGL2RenderingContext.MAX;
                this._gl.MIN = blendMinMaxExtension.MIN_EXT as typeof WebGL2RenderingContext.MIN;
            }
        }

        // sRGB buffers
        // only run this if not already set to true (in the constructor, for example)
        if (!this._caps.supportSRGBBuffers) {
            if (this._webGLVersion > 1) {
                this._caps.supportSRGBBuffers = true;
                this._glSRGBExtensionValues = {
                    SRGB: WebGL2RenderingContext.SRGB,
                    SRGB8: WebGL2RenderingContext.SRGB8,
                    SRGB8_ALPHA8: WebGL2RenderingContext.SRGB8_ALPHA8,
                };
            } else {
                const sRGBExtension = this._gl.getExtension("EXT_sRGB");

                if (sRGBExtension != null) {
                    this._caps.supportSRGBBuffers = true;
                    this._glSRGBExtensionValues = {
                        SRGB: sRGBExtension.SRGB_EXT as typeof WebGL2RenderingContext.SRGB,
                        SRGB8: sRGBExtension.SRGB_ALPHA_EXT as typeof WebGL2RenderingContext.SRGB8 | EXT_sRGB["SRGB_ALPHA_EXT"],
                        SRGB8_ALPHA8: sRGBExtension.SRGB_ALPHA_EXT as typeof WebGL2RenderingContext.SRGB8_ALPHA8,
                    };
                }
            }
            // take into account the forced state that was provided in options
            if (this._creationOptions) {
                const forceSRGBBufferSupportState = (this._creationOptions as EngineOptions).forceSRGBBufferSupportState;
                if (forceSRGBBufferSupportState !== undefined) {
                    this._caps.supportSRGBBuffers = this._caps.supportSRGBBuffers && forceSRGBBufferSupportState;
                }
            }
        }

        // Depth buffer
        this._depthCullingState.depthTest = true;
        this._depthCullingState.depthFunc = this._gl.LEQUAL;
        this._depthCullingState.depthMask = true;

        // Texture maps
        this._maxSimultaneousTextures = this._caps.maxCombinedTexturesImageUnits;
        for (let slot = 0; slot < this._maxSimultaneousTextures; slot++) {
            this._nextFreeTextureSlots.push(slot);
        }

        if (this._glRenderer === "Mali-G72") {
            // Overcome a bug when using a texture to store morph targets on Mali-G72
            this._caps.disableMorphTargetTexture = true;
        }
    }

    protected _initFeatures(): void {
        this._features = {
            forceBitmapOverHTMLImageElement: typeof HTMLImageElement === "undefined",
            supportRenderAndCopyToLodForFloatTextures: this._webGLVersion !== 1,
            supportDepthStencilTexture: this._webGLVersion !== 1,
            supportShadowSamplers: this._webGLVersion !== 1,
            uniformBufferHardCheckMatrix: false,
            allowTexturePrefiltering: this._webGLVersion !== 1,
            trackUbosInFrame: false,
            checkUbosContentBeforeUpload: false,
            supportCSM: this._webGLVersion !== 1,
            basisNeedsPOT: this._webGLVersion === 1,
            support3DTextures: this._webGLVersion !== 1,
            needTypeSuffixInShaderConstants: this._webGLVersion !== 1,
            supportMSAA: this._webGLVersion !== 1,
            supportSSAO2: this._webGLVersion !== 1,
            supportIBLShadows: this._webGLVersion !== 1,
            supportExtendedTextureFormats: this._webGLVersion !== 1,
            supportSwitchCaseInShader: this._webGLVersion !== 1,
            supportSyncTextureRead: true,
            needsInvertingBitmap: true,
            useUBOBindingCache: true,
            needShaderCodeInlining: false,
            needToAlwaysBindUniformBuffers: false,
            supportRenderPasses: false,
            supportSpriteInstancing: true,
            forceVertexBufferStrideAndOffsetMultiple4Bytes: false,
            _checkNonFloatVertexBuffersDontRecreatePipelineContext: false,
            _collectUbosUpdatedInFrame: false,
        };
    }

    /**
     * Gets version of the current webGL context
     * Keep it for back compat - use version instead
     */
    public get webGLVersion(): number {
        return this._webGLVersion;
    }

    /**
     * Gets a string identifying the name of the class
     * @returns "Engine" string
     */
    public override getClassName(): string {
        return "ThinEngine";
    }

    /** @internal */
    public _prepareWorkingCanvas(): void {
        if (this._workingCanvas) {
            return;
        }

        this._workingCanvas = this.createCanvas(1, 1);
        const context = this._workingCanvas.getContext("2d");

        if (context) {
            this._workingContext = context;
        }
    }

    /**
     * Gets an object containing information about the current engine context
     * @returns an object containing the vendor, the renderer and the version of the current engine context
     */
    public getInfo() {
        return this.getGlInfo();
    }

    /**
     * Gets an object containing information about the current webGL context
     * @returns an object containing the vendor, the renderer and the version of the current webGL context
     */
    public getGlInfo() {
        return {
            vendor: this._glVendor,
            renderer: this._glRenderer,
            version: this._glVersion,
        };
    }

    /**Gets driver info if available */
    public extractDriverInfo() {
        const glInfo = this.getGlInfo();
        if (glInfo && glInfo.renderer) {
            return glInfo.renderer;
        }

        return "";
    }

    /**
     * Gets the current render width
     * @param useScreen defines if screen size must be used (or the current render target if any)
     * @returns a number defining the current render width
     */
    public getRenderWidth(useScreen = false): number {
        if (!useScreen && this._currentRenderTarget) {
            return this._currentRenderTarget.width;
        }

        return this._framebufferDimensionsObject ? this._framebufferDimensionsObject.framebufferWidth : this._gl.drawingBufferWidth;
    }

    /**
     * Gets the current render height
     * @param useScreen defines if screen size must be used (or the current render target if any)
     * @returns a number defining the current render height
     */
    public getRenderHeight(useScreen = false): number {
        if (!useScreen && this._currentRenderTarget) {
            return this._currentRenderTarget.height;
        }

        return this._framebufferDimensionsObject ? this._framebufferDimensionsObject.framebufferHeight : this._gl.drawingBufferHeight;
    }

    /**
     * Clear the current render buffer or the current render target (if any is set up)
     * @param color defines the color to use
     * @param backBuffer defines if the back buffer must be cleared
     * @param depth defines if the depth buffer must be cleared
     * @param stencil defines if the stencil buffer must be cleared
     * @param stencilClearValue defines the value to use to clear the stencil buffer (default is 0)
     */
    public clear(color: Nullable<IColor4Like>, backBuffer: boolean, depth: boolean, stencil: boolean = false, stencilClearValue = 0): void {
        const useStencilGlobalOnly = this.stencilStateComposer.useStencilGlobalOnly;
        this.stencilStateComposer.useStencilGlobalOnly = true; // make sure the stencil mask is coming from the global stencil and not from a material (effect) which would currently be in effect

        this.applyStates();

        this.stencilStateComposer.useStencilGlobalOnly = useStencilGlobalOnly;

        let mode = 0;
        if (backBuffer && color) {
            let setBackBufferColor = true;
            if (this._currentRenderTarget) {
                const textureFormat = this._currentRenderTarget.texture?.format;
                if (
                    textureFormat === Constants.TEXTUREFORMAT_RED_INTEGER ||
                    textureFormat === Constants.TEXTUREFORMAT_RG_INTEGER ||
                    textureFormat === Constants.TEXTUREFORMAT_RGB_INTEGER ||
                    textureFormat === Constants.TEXTUREFORMAT_RGBA_INTEGER
                ) {
                    const textureType = this._currentRenderTarget.texture?.type;
                    if (textureType === Constants.TEXTURETYPE_UNSIGNED_INTEGER || textureType === Constants.TEXTURETYPE_UNSIGNED_SHORT) {
                        ThinEngine._TempClearColorUint32[0] = color.r * 255;
                        ThinEngine._TempClearColorUint32[1] = color.g * 255;
                        ThinEngine._TempClearColorUint32[2] = color.b * 255;
                        ThinEngine._TempClearColorUint32[3] = color.a * 255;
                        this._gl.clearBufferuiv(this._gl.COLOR, 0, ThinEngine._TempClearColorUint32);
                        setBackBufferColor = false;
                    } else {
                        ThinEngine._TempClearColorInt32[0] = color.r * 255;
                        ThinEngine._TempClearColorInt32[1] = color.g * 255;
                        ThinEngine._TempClearColorInt32[2] = color.b * 255;
                        ThinEngine._TempClearColorInt32[3] = color.a * 255;
                        this._gl.clearBufferiv(this._gl.COLOR, 0, ThinEngine._TempClearColorInt32);
                        setBackBufferColor = false;
                    }
                }
            }

            if (setBackBufferColor) {
                this._gl.clearColor(color.r, color.g, color.b, color.a !== undefined ? color.a : 1.0);
                mode |= this._gl.COLOR_BUFFER_BIT;
            }
        }

        if (depth) {
            if (this.useReverseDepthBuffer) {
                this._depthCullingState.depthFunc = this._gl.GEQUAL;
                this._gl.clearDepth(0.0);
            } else {
                this._gl.clearDepth(1.0);
            }
            mode |= this._gl.DEPTH_BUFFER_BIT;
        }
        if (stencil) {
            this._gl.clearStencil(stencilClearValue);
            mode |= this._gl.STENCIL_BUFFER_BIT;
        }
        this._gl.clear(mode);
    }

    /**
     * @internal
     */
    public _viewport(x: number, y: number, width: number, height: number): void {
        if (x !== this._viewportCached.x || y !== this._viewportCached.y || width !== this._viewportCached.z || height !== this._viewportCached.w) {
            this._viewportCached.x = x;
            this._viewportCached.y = y;
            this._viewportCached.z = width;
            this._viewportCached.w = height;

            this._gl.viewport(x, y, width, height);
        }
    }

    /**
     * End the current frame
     */
    public override endFrame(): void {
        super.endFrame();
        // Force a flush in case we are using a bad OS.
        if (this._badOS) {
            this.flushFramebuffer();
        }
    }

    /**
     * Gets the performance monitor attached to this engine
     * @see https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene#engineinstrumentation
     */
    public get performanceMonitor(): PerformanceMonitor {
        throw new Error("Not Supported by ThinEngine");
    }

    /**
     * Binds the frame buffer to the specified texture.
     * @param rtWrapper The render target wrapper to render to
     * @param faceIndex The face of the texture to render to in case of cube texture and if the render target wrapper is not a multi render target
     * @param requiredWidth The width of the target to render to
     * @param requiredHeight The height of the target to render to
     * @param forceFullscreenViewport Forces the viewport to be the entire texture/screen if true
     * @param lodLevel Defines the lod level to bind to the frame buffer
     * @param layer Defines the 2d array index to bind to the frame buffer if the render target wrapper is not a multi render target
     */
    public bindFramebuffer(
        rtWrapper: RenderTargetWrapper,
        faceIndex: number = 0,
        requiredWidth?: number,
        requiredHeight?: number,
        forceFullscreenViewport?: boolean,
        lodLevel = 0,
        layer = 0
    ): void {
        const webglRtWrapper = rtWrapper as WebGLRenderTargetWrapper;

        if (this._currentRenderTarget) {
            this._resolveAndGenerateMipMapsFramebuffer(this._currentRenderTarget);
        }
        this._currentRenderTarget = rtWrapper;
        this._bindUnboundFramebuffer(webglRtWrapper._framebuffer);

        const gl = this._gl;
        if (!rtWrapper.isMulti) {
            if (rtWrapper.is2DArray || rtWrapper.is3D) {
                gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, rtWrapper.texture!._hardwareTexture?.underlyingResource, lodLevel, layer);
                webglRtWrapper._currentLOD = lodLevel;
            } else if (rtWrapper.isCube) {
                gl.framebufferTexture2D(
                    gl.FRAMEBUFFER,
                    gl.COLOR_ATTACHMENT0,
                    gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceIndex,
                    rtWrapper.texture!._hardwareTexture?.underlyingResource,
                    lodLevel
                );
            } else if (webglRtWrapper._currentLOD !== lodLevel) {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rtWrapper.texture!._hardwareTexture?.underlyingResource, lodLevel);
                webglRtWrapper._currentLOD = lodLevel;
            }
        }

        const depthStencilTexture = rtWrapper._depthStencilTexture;
        if (depthStencilTexture) {
            if (rtWrapper.is3D) {
                if (
                    rtWrapper.texture!.width !== depthStencilTexture.width ||
                    rtWrapper.texture!.height !== depthStencilTexture.height ||
                    rtWrapper.texture!.depth !== depthStencilTexture.depth
                ) {
                    Logger.Warn("Depth/Stencil attachment for 3D target must have same dimensions as color attachment");
                }
            }
            const attachment = rtWrapper._depthStencilTextureWithStencil ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;
            if (rtWrapper.is2DArray || rtWrapper.is3D) {
                gl.framebufferTextureLayer(gl.FRAMEBUFFER, attachment, depthStencilTexture._hardwareTexture?.underlyingResource, lodLevel, layer);
            } else if (rtWrapper.isCube) {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceIndex, depthStencilTexture._hardwareTexture?.underlyingResource, lodLevel);
            } else {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, depthStencilTexture._hardwareTexture?.underlyingResource, lodLevel);
            }
        }

        if (webglRtWrapper._MSAAFramebuffer) {
            this._bindUnboundFramebuffer(webglRtWrapper._MSAAFramebuffer);
        }

        if (this._cachedViewport && !forceFullscreenViewport) {
            this.setViewport(this._cachedViewport, requiredWidth, requiredHeight);
        } else {
            if (!requiredWidth) {
                requiredWidth = rtWrapper.width;
                if (lodLevel) {
                    requiredWidth = requiredWidth / Math.pow(2, lodLevel);
                }
            }
            if (!requiredHeight) {
                requiredHeight = rtWrapper.height;
                if (lodLevel) {
                    requiredHeight = requiredHeight / Math.pow(2, lodLevel);
                }
            }

            this._viewport(0, 0, requiredWidth, requiredHeight);
        }

        this.wipeCaches();
    }

    public override setStateCullFaceType(cullBackFaces?: boolean, force?: boolean): void {
        const cullFace = (this.cullBackFaces ?? cullBackFaces ?? true) ? this._gl.BACK : this._gl.FRONT;
        if (this._depthCullingState.cullFace !== cullFace || force) {
            this._depthCullingState.cullFace = cullFace;
        }
    }

    /**
     * Set various states to the webGL context
     * @param culling defines culling state: true to enable culling, false to disable it
     * @param zOffset defines the value to apply to zOffset (0 by default)
     * @param force defines if states must be applied even if cache is up to date
     * @param reverseSide defines if culling must be reversed (CCW if false, CW if true)
     * @param cullBackFaces true to cull back faces, false to cull front faces (if culling is enabled)
     * @param stencil stencil states to set
     * @param zOffsetUnits defines the value to apply to zOffsetUnits (0 by default)
     */
    public setState(culling: boolean, zOffset: number = 0, force?: boolean, reverseSide = false, cullBackFaces?: boolean, stencil?: IStencilState, zOffsetUnits: number = 0): void {
        // Culling
        if (this._depthCullingState.cull !== culling || force) {
            this._depthCullingState.cull = culling;
        }

        // Cull face
        this.setStateCullFaceType(cullBackFaces, force);

        // Z offset
        this.setZOffset(zOffset);
        this.setZOffsetUnits(zOffsetUnits);

        // Front face
        const frontFace = reverseSide ? this._gl.CW : this._gl.CCW;
        if (this._depthCullingState.frontFace !== frontFace || force) {
            this._depthCullingState.frontFace = frontFace;
        }

        this._stencilStateComposer.stencilMaterial = stencil;
    }

    private _resolveAndGenerateMipMapsFramebuffer(texture: RenderTargetWrapper, disableGenerateMipMaps = false): void {
        const webglRtWrapper = texture as WebGLRenderTargetWrapper;

        if (!webglRtWrapper.disableAutomaticMSAAResolve) {
            if (texture.isMulti) {
                this.resolveMultiFramebuffer(texture);
            } else {
                this.resolveFramebuffer(texture);
            }
        }

        if (!disableGenerateMipMaps) {
            if (texture.isMulti) {
                this.generateMipMapsMultiFramebuffer(texture);
            } else {
                this.generateMipMapsFramebuffer(texture);
            }
        }
    }

    /**
     * @internal
     */
    public _bindUnboundFramebuffer(framebuffer: Nullable<WebGLFramebuffer>) {
        if (this._currentFramebuffer !== framebuffer) {
            this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, framebuffer);
            this._currentFramebuffer = framebuffer;
        }
    }

    /** @internal */
    public _currentFrameBufferIsDefaultFrameBuffer() {
        return this._currentFramebuffer === null;
    }

    /**
     * Generates the mipmaps for a texture
     * @param texture texture to generate the mipmaps for
     */
    public generateMipmaps(texture: InternalTexture): void {
        const target = this._getTextureTarget(texture);
        this._bindTextureDirectly(target, texture, true);
        this._gl.generateMipmap(target);
        this._bindTextureDirectly(target, null);
    }

    /**
     * Unbind the current render target texture from the webGL context
     * @param texture defines the render target wrapper to unbind
     * @param disableGenerateMipMaps defines a boolean indicating that mipmaps must not be generated
     * @param onBeforeUnbind defines a function which will be called before the effective unbind
     */
    public unBindFramebuffer(texture: RenderTargetWrapper, disableGenerateMipMaps?: boolean, onBeforeUnbind?: () => void): void {
        const webglRtWrapper = texture as WebGLRenderTargetWrapper;

        this._currentRenderTarget = null;
        this._resolveAndGenerateMipMapsFramebuffer(texture, disableGenerateMipMaps);

        if (onBeforeUnbind) {
            if (webglRtWrapper._MSAAFramebuffer) {
                // Bind the correct framebuffer
                this._bindUnboundFramebuffer(webglRtWrapper._framebuffer);
            }
            onBeforeUnbind();
        }

        this._bindUnboundFramebuffer(null);
    }

    /**
     * Generates mipmaps for the texture of the (single) render target
     * @param texture The render target containing the texture to generate the mipmaps for
     */
    public generateMipMapsFramebuffer(texture: RenderTargetWrapper): void {
        if (!texture.isMulti && texture.texture?.generateMipMaps && !texture.isCube) {
            this.generateMipmaps(texture.texture);
        }
    }

    /**
     * Resolves the MSAA texture of the (single) render target into its non-MSAA version.
     * Note that if "texture" is not a MSAA render target, no resolve is performed.
     * @param texture  The render target texture containing the MSAA textures to resolve
     */
    public resolveFramebuffer(texture: RenderTargetWrapper): void {
        const rtWrapper = texture as WebGLRenderTargetWrapper;
        const gl = this._gl;

        if (!rtWrapper._MSAAFramebuffer || rtWrapper.isMulti) {
            return;
        }

        let bufferBits = rtWrapper.resolveMSAAColors ? gl.COLOR_BUFFER_BIT : 0;
        bufferBits |= rtWrapper._generateDepthBuffer && rtWrapper.resolveMSAADepth ? gl.DEPTH_BUFFER_BIT : 0;
        bufferBits |= rtWrapper._generateStencilBuffer && rtWrapper.resolveMSAAStencil ? gl.STENCIL_BUFFER_BIT : 0;

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rtWrapper._MSAAFramebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rtWrapper._framebuffer);
        gl.blitFramebuffer(0, 0, texture.width, texture.height, 0, 0, texture.width, texture.height, bufferBits, gl.NEAREST);
    }

    /**
     * Force a webGL flush (ie. a flush of all waiting webGL commands)
     */
    public flushFramebuffer(): void {
        this._gl.flush();
    }

    /**
     * Unbind the current render target and bind the default framebuffer
     */
    public restoreDefaultFramebuffer(): void {
        if (this._currentRenderTarget) {
            this.unBindFramebuffer(this._currentRenderTarget);
        } else {
            this._bindUnboundFramebuffer(null);
        }
        if (this._cachedViewport) {
            this.setViewport(this._cachedViewport);
        }

        this.wipeCaches();
    }

    // VBOs

    /** @internal */
    protected _resetVertexBufferBinding(): void {
        this.bindArrayBuffer(null);
        this._cachedVertexBuffers = null;
    }

    /**
     * Creates a vertex buffer
     * @param data the data or size for the vertex buffer
     * @param _updatable whether the buffer should be created as updatable
     * @param _label defines the label of the buffer (for debug purpose)
     * @returns the new WebGL static buffer
     */
    public createVertexBuffer(data: DataArray | number, _updatable?: boolean, _label?: string): DataBuffer {
        return this._createVertexBuffer(data, this._gl.STATIC_DRAW);
    }

    private _createVertexBuffer(data: DataArray | number, usage: number): DataBuffer {
        const vbo = this._gl.createBuffer();

        if (!vbo) {
            throw new Error("Unable to create vertex buffer");
        }

        const dataBuffer = new WebGLDataBuffer(vbo);
        this.bindArrayBuffer(dataBuffer);

        if (typeof data !== "number") {
            if (data instanceof Array) {
                this._gl.bufferData(this._gl.ARRAY_BUFFER, new Float32Array(data), usage);
                dataBuffer.capacity = data.length * 4;
            } else {
                this._gl.bufferData(this._gl.ARRAY_BUFFER, <ArrayBuffer>data, usage);
                dataBuffer.capacity = data.byteLength;
            }
        } else {
            this._gl.bufferData(this._gl.ARRAY_BUFFER, new Uint8Array(data), usage);
            dataBuffer.capacity = data;
        }

        this._resetVertexBufferBinding();

        dataBuffer.references = 1;
        return dataBuffer;
    }

    /**
     * Creates a dynamic vertex buffer
     * @param data the data for the dynamic vertex buffer
     * @param _label defines the label of the buffer (for debug purpose)
     * @returns the new WebGL dynamic buffer
     */
    public createDynamicVertexBuffer(data: DataArray | number, _label?: string): DataBuffer {
        return this._createVertexBuffer(data, this._gl.DYNAMIC_DRAW);
    }

    protected _resetIndexBufferBinding(): void {
        this.bindIndexBuffer(null);
        this._cachedIndexBuffer = null;
    }

    /**
     * Creates a new index buffer
     * @param indices defines the content of the index buffer
     * @param updatable defines if the index buffer must be updatable
     * @param _label defines the label of the buffer (for debug purpose)
     * @returns a new webGL buffer
     */
    public createIndexBuffer(indices: IndicesArray, updatable?: boolean, _label?: string): DataBuffer {
        const vbo = this._gl.createBuffer();
        const dataBuffer = new WebGLDataBuffer(vbo);

        if (!vbo) {
            throw new Error("Unable to create index buffer");
        }

        this.bindIndexBuffer(dataBuffer);

        const data = this._normalizeIndexData(indices);
        this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, data, updatable ? this._gl.DYNAMIC_DRAW : this._gl.STATIC_DRAW);
        this._resetIndexBufferBinding();
        dataBuffer.references = 1;
        dataBuffer.is32Bits = data.BYTES_PER_ELEMENT === 4;
        return dataBuffer;
    }

    protected _normalizeIndexData(indices: IndicesArray): Uint16Array | Uint32Array {
        const bytesPerElement = (indices as Exclude<IndicesArray, number[]>).BYTES_PER_ELEMENT;
        if (bytesPerElement === 2) {
            return indices as Uint16Array;
        }

        // Check 32 bit support
        if (this._caps.uintIndices) {
            if (indices instanceof Uint32Array) {
                return indices;
            } else {
                // number[] or Int32Array, check if 32 bit is necessary
                for (let index = 0; index < indices.length; index++) {
                    if (indices[index] >= 65535) {
                        return new Uint32Array(indices);
                    }
                }

                return new Uint16Array(indices);
            }
        }

        // No 32 bit support, force conversion to 16 bit (values greater 16 bit are lost)
        return new Uint16Array(indices);
    }

    /**
     * Bind a webGL buffer to the webGL context
     * @param buffer defines the buffer to bind
     */
    public bindArrayBuffer(buffer: Nullable<DataBuffer>): void {
        if (!this._vaoRecordInProgress) {
            this._unbindVertexArrayObject();
        }
        this._bindBuffer(buffer, this._gl.ARRAY_BUFFER);
    }

    /**
     * Bind a specific block at a given index in a specific shader program
     * @param pipelineContext defines the pipeline context to use
     * @param blockName defines the block name
     * @param index defines the index where to bind the block
     */
    public bindUniformBlock(pipelineContext: IPipelineContext, blockName: string, index: number): void {
        const program = (pipelineContext as WebGLPipelineContext).program!;

        const uniformLocation = this._gl.getUniformBlockIndex(program, blockName);

        this._gl.uniformBlockBinding(program, uniformLocation, index);
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected bindIndexBuffer(buffer: Nullable<DataBuffer>): void {
        if (!this._vaoRecordInProgress) {
            this._unbindVertexArrayObject();
        }
        this._bindBuffer(buffer, this._gl.ELEMENT_ARRAY_BUFFER);
    }

    private _bindBuffer(buffer: Nullable<DataBuffer>, target: number): void {
        if (this._vaoRecordInProgress || this._currentBoundBuffer[target] !== buffer) {
            this._gl.bindBuffer(target, buffer ? buffer.underlyingResource : null);
            this._currentBoundBuffer[target] = buffer;
        }
    }

    /**
     * update the bound buffer with the given data
     * @param data defines the data to update
     */
    public updateArrayBuffer(data: Float32Array): void {
        this._gl.bufferSubData(this._gl.ARRAY_BUFFER, 0, data);
    }

    private _vertexAttribPointer(buffer: DataBuffer, indx: number, size: number, type: number, normalized: boolean, stride: number, offset: number): void {
        const pointer = this._currentBufferPointers[indx];
        if (!pointer) {
            return;
        }

        let changed = false;
        if (!pointer.active) {
            changed = true;
            pointer.active = true;
            pointer.index = indx;
            pointer.size = size;
            pointer.type = type;
            pointer.normalized = normalized;
            pointer.stride = stride;
            pointer.offset = offset;
            pointer.buffer = buffer;
        } else {
            if (pointer.buffer !== buffer) {
                pointer.buffer = buffer;
                changed = true;
            }
            if (pointer.size !== size) {
                pointer.size = size;
                changed = true;
            }
            if (pointer.type !== type) {
                pointer.type = type;
                changed = true;
            }
            if (pointer.normalized !== normalized) {
                pointer.normalized = normalized;
                changed = true;
            }
            if (pointer.stride !== stride) {
                pointer.stride = stride;
                changed = true;
            }
            if (pointer.offset !== offset) {
                pointer.offset = offset;
                changed = true;
            }
        }

        if (changed || this._vaoRecordInProgress) {
            this.bindArrayBuffer(buffer);
            if (type === this._gl.UNSIGNED_INT || type === this._gl.INT) {
                this._gl.vertexAttribIPointer(indx, size, type, stride, offset);
            } else {
                this._gl.vertexAttribPointer(indx, size, type, normalized, stride, offset);
            }
        }
    }

    /**
     * @internal
     */
    public _bindIndexBufferWithCache(indexBuffer: Nullable<DataBuffer>): void {
        if (indexBuffer == null) {
            return;
        }
        if (this._cachedIndexBuffer !== indexBuffer) {
            this._cachedIndexBuffer = indexBuffer;
            this.bindIndexBuffer(indexBuffer);
            this._uintIndicesCurrentlySet = indexBuffer.is32Bits;
        }
    }

    private _bindVertexBuffersAttributes(
        vertexBuffers: { [key: string]: Nullable<VertexBuffer> },
        effect: Effect,
        overrideVertexBuffers?: { [kind: string]: Nullable<VertexBuffer> }
    ): void {
        const attributes = effect.getAttributesNames();

        if (!this._vaoRecordInProgress) {
            this._unbindVertexArrayObject();
        }

        this.unbindAllAttributes();

        for (let index = 0; index < attributes.length; index++) {
            const order = effect.getAttributeLocation(index);

            if (order >= 0) {
                const ai = attributes[index];
                let vertexBuffer: Nullable<VertexBuffer> = null;

                if (overrideVertexBuffers) {
                    vertexBuffer = overrideVertexBuffers[ai];
                }

                if (!vertexBuffer) {
                    vertexBuffer = vertexBuffers[ai];
                }

                if (!vertexBuffer) {
                    continue;
                }

                this._gl.enableVertexAttribArray(order);
                if (!this._vaoRecordInProgress) {
                    this._vertexAttribArraysEnabled[order] = true;
                }

                const buffer = vertexBuffer.getBuffer();
                if (buffer) {
                    this._vertexAttribPointer(buffer, order, vertexBuffer.getSize(), vertexBuffer.type, vertexBuffer.normalized, vertexBuffer.byteStride, vertexBuffer.byteOffset);

                    if (vertexBuffer.getIsInstanced()) {
                        this._gl.vertexAttribDivisor(order, vertexBuffer.getInstanceDivisor());
                        if (!this._vaoRecordInProgress) {
                            this._currentInstanceLocations.push(order);
                            this._currentInstanceBuffers.push(buffer);
                        }
                    }
                }
            }
        }
    }

    /**
     * Records a vertex array object
     * @see https://doc.babylonjs.com/setup/support/webGL2#vertex-array-objects
     * @param vertexBuffers defines the list of vertex buffers to store
     * @param indexBuffer defines the index buffer to store
     * @param effect defines the effect to store
     * @param overrideVertexBuffers defines optional list of avertex buffers that overrides the entries in vertexBuffers
     * @returns the new vertex array object
     */
    public recordVertexArrayObject(
        vertexBuffers: { [key: string]: VertexBuffer },
        indexBuffer: Nullable<DataBuffer>,
        effect: Effect,
        overrideVertexBuffers?: { [kind: string]: Nullable<VertexBuffer> }
    ): WebGLVertexArrayObject {
        const vao = this._gl.createVertexArray();

        if (!vao) {
            throw new Error("Unable to create VAO");
        }

        this._vaoRecordInProgress = true;

        this._gl.bindVertexArray(vao);

        this._mustWipeVertexAttributes = true;
        this._bindVertexBuffersAttributes(vertexBuffers, effect, overrideVertexBuffers);

        this.bindIndexBuffer(indexBuffer);

        this._vaoRecordInProgress = false;
        this._gl.bindVertexArray(null);

        return vao;
    }

    /**
     * Bind a specific vertex array object
     * @see https://doc.babylonjs.com/setup/support/webGL2#vertex-array-objects
     * @param vertexArrayObject defines the vertex array object to bind
     * @param indexBuffer defines the index buffer to bind
     */
    public bindVertexArrayObject(vertexArrayObject: WebGLVertexArrayObject, indexBuffer: Nullable<DataBuffer>): void {
        if (this._cachedVertexArrayObject !== vertexArrayObject) {
            this._cachedVertexArrayObject = vertexArrayObject;

            this._gl.bindVertexArray(vertexArrayObject);
            this._cachedVertexBuffers = null;
            this._cachedIndexBuffer = null;

            this._uintIndicesCurrentlySet = indexBuffer != null && indexBuffer.is32Bits;
            this._mustWipeVertexAttributes = true;
        }
    }

    /**
     * Bind webGl buffers directly to the webGL context
     * @param vertexBuffer defines the vertex buffer to bind
     * @param indexBuffer defines the index buffer to bind
     * @param vertexDeclaration defines the vertex declaration to use with the vertex buffer
     * @param vertexStrideSize defines the vertex stride of the vertex buffer
     * @param effect defines the effect associated with the vertex buffer
     */
    public bindBuffersDirectly(vertexBuffer: DataBuffer, indexBuffer: DataBuffer, vertexDeclaration: number[], vertexStrideSize: number, effect: Effect): void {
        if (this._cachedVertexBuffers !== vertexBuffer || this._cachedEffectForVertexBuffers !== effect) {
            this._cachedVertexBuffers = vertexBuffer;
            this._cachedEffectForVertexBuffers = effect;

            const attributesCount = effect.getAttributesCount();

            this._unbindVertexArrayObject();
            this.unbindAllAttributes();

            let offset = 0;
            for (let index = 0; index < attributesCount; index++) {
                if (index < vertexDeclaration.length) {
                    const order = effect.getAttributeLocation(index);

                    if (order >= 0) {
                        this._gl.enableVertexAttribArray(order);
                        this._vertexAttribArraysEnabled[order] = true;
                        this._vertexAttribPointer(vertexBuffer, order, vertexDeclaration[index], this._gl.FLOAT, false, vertexStrideSize, offset);
                    }

                    offset += vertexDeclaration[index] * 4;
                }
            }
        }

        this._bindIndexBufferWithCache(indexBuffer);
    }

    private _unbindVertexArrayObject(): void {
        if (!this._cachedVertexArrayObject) {
            return;
        }

        this._cachedVertexArrayObject = null;
        this._gl.bindVertexArray(null);
    }

    /**
     * Bind a list of vertex buffers to the webGL context
     * @param vertexBuffers defines the list of vertex buffers to bind
     * @param indexBuffer defines the index buffer to bind
     * @param effect defines the effect associated with the vertex buffers
     * @param overrideVertexBuffers defines optional list of avertex buffers that overrides the entries in vertexBuffers
     */
    public bindBuffers(
        vertexBuffers: { [key: string]: Nullable<VertexBuffer> },
        indexBuffer: Nullable<DataBuffer>,
        effect: Effect,
        overrideVertexBuffers?: { [kind: string]: Nullable<VertexBuffer> }
    ): void {
        if (this._cachedVertexBuffers !== vertexBuffers || this._cachedEffectForVertexBuffers !== effect) {
            this._cachedVertexBuffers = vertexBuffers;
            this._cachedEffectForVertexBuffers = effect;

            this._bindVertexBuffersAttributes(vertexBuffers, effect, overrideVertexBuffers);
        }

        this._bindIndexBufferWithCache(indexBuffer);
    }

    /**
     * Unbind all instance attributes
     */
    public unbindInstanceAttributes() {
        let boundBuffer;
        for (let i = 0, ul = this._currentInstanceLocations.length; i < ul; i++) {
            const instancesBuffer = this._currentInstanceBuffers[i];
            if (boundBuffer != instancesBuffer && instancesBuffer.references) {
                boundBuffer = instancesBuffer;
                this.bindArrayBuffer(instancesBuffer);
            }
            const offsetLocation = this._currentInstanceLocations[i];
            this._gl.vertexAttribDivisor(offsetLocation, 0);
        }
        this._currentInstanceBuffers.length = 0;
        this._currentInstanceLocations.length = 0;
    }

    /**
     * Release and free the memory of a vertex array object
     * @param vao defines the vertex array object to delete
     */
    public releaseVertexArrayObject(vao: WebGLVertexArrayObject) {
        this._gl.deleteVertexArray(vao);
    }

    /**
     * @internal
     */
    public _releaseBuffer(buffer: DataBuffer): boolean {
        buffer.references--;

        if (buffer.references === 0) {
            this._deleteBuffer(buffer);
            return true;
        }

        return false;
    }

    protected _deleteBuffer(buffer: DataBuffer): void {
        this._gl.deleteBuffer(buffer.underlyingResource);
    }

    /**
     * Update the content of a webGL buffer used with instantiation and bind it to the webGL context
     * @param instancesBuffer defines the webGL buffer to update and bind
     * @param data defines the data to store in the buffer
     * @param offsetLocations defines the offsets or attributes information used to determine where data must be stored in the buffer
     */
    public updateAndBindInstancesBuffer(instancesBuffer: DataBuffer, data: Float32Array, offsetLocations: number[] | InstancingAttributeInfo[]): void {
        this.bindArrayBuffer(instancesBuffer);
        if (data) {
            this._gl.bufferSubData(this._gl.ARRAY_BUFFER, 0, data);
        }

        if ((<any>offsetLocations[0]).index !== undefined) {
            this.bindInstancesBuffer(instancesBuffer, offsetLocations as any, true);
        } else {
            for (let index = 0; index < 4; index++) {
                const offsetLocation = <number>offsetLocations[index];

                if (!this._vertexAttribArraysEnabled[offsetLocation]) {
                    this._gl.enableVertexAttribArray(offsetLocation);
                    this._vertexAttribArraysEnabled[offsetLocation] = true;
                }

                this._vertexAttribPointer(instancesBuffer, offsetLocation, 4, this._gl.FLOAT, false, 64, index * 16);
                this._gl.vertexAttribDivisor(offsetLocation, 1);
                this._currentInstanceLocations.push(offsetLocation);
                this._currentInstanceBuffers.push(instancesBuffer);
            }
        }
    }

    /**
     * Bind the content of a webGL buffer used with instantiation
     * @param instancesBuffer defines the webGL buffer to bind
     * @param attributesInfo defines the offsets or attributes information used to determine where data must be stored in the buffer
     * @param computeStride defines Whether to compute the strides from the info or use the default 0
     */
    public bindInstancesBuffer(instancesBuffer: DataBuffer, attributesInfo: InstancingAttributeInfo[], computeStride = true): void {
        this.bindArrayBuffer(instancesBuffer);

        let stride = 0;
        if (computeStride) {
            for (let i = 0; i < attributesInfo.length; i++) {
                const ai = attributesInfo[i];
                stride += ai.attributeSize * 4;
            }
        }

        for (let i = 0; i < attributesInfo.length; i++) {
            const ai = attributesInfo[i];
            if (ai.index === undefined) {
                ai.index = this._currentEffect!.getAttributeLocationByName(ai.attributeName);
            }

            if (ai.index < 0) {
                continue;
            }

            if (!this._vertexAttribArraysEnabled[ai.index]) {
                this._gl.enableVertexAttribArray(ai.index);
                this._vertexAttribArraysEnabled[ai.index] = true;
            }

            this._vertexAttribPointer(instancesBuffer, ai.index, ai.attributeSize, ai.attributeType || this._gl.FLOAT, ai.normalized || false, stride, ai.offset);
            this._gl.vertexAttribDivisor(ai.index, ai.divisor === undefined ? 1 : ai.divisor);
            this._currentInstanceLocations.push(ai.index);
            this._currentInstanceBuffers.push(instancesBuffer);
        }
    }

    /**
     * Disable the instance attribute corresponding to the name in parameter
     * @param name defines the name of the attribute to disable
     */
    public disableInstanceAttributeByName(name: string) {
        if (!this._currentEffect) {
            return;
        }

        const attributeLocation = this._currentEffect.getAttributeLocationByName(name);
        this.disableInstanceAttribute(attributeLocation);
    }

    /**
     * Disable the instance attribute corresponding to the location in parameter
     * @param attributeLocation defines the attribute location of the attribute to disable
     */
    public disableInstanceAttribute(attributeLocation: number) {
        let shouldClean = false;
        let index: number;
        while ((index = this._currentInstanceLocations.indexOf(attributeLocation)) !== -1) {
            this._currentInstanceLocations.splice(index, 1);
            this._currentInstanceBuffers.splice(index, 1);

            shouldClean = true;
            index = this._currentInstanceLocations.indexOf(attributeLocation);
        }

        if (shouldClean) {
            this._gl.vertexAttribDivisor(attributeLocation, 0);
            this.disableAttributeByIndex(attributeLocation);
        }
    }

    /**
     * Disable the attribute corresponding to the location in parameter
     * @param attributeLocation defines the attribute location of the attribute to disable
     */
    public disableAttributeByIndex(attributeLocation: number) {
        this._gl.disableVertexAttribArray(attributeLocation);
        this._vertexAttribArraysEnabled[attributeLocation] = false;
        this._currentBufferPointers[attributeLocation].active = false;
    }

    /**
     * Send a draw order
     * @param useTriangles defines if triangles must be used to draw (else wireframe will be used)
     * @param indexStart defines the starting index
     * @param indexCount defines the number of index to draw
     * @param instancesCount defines the number of instances to draw (if instantiation is enabled)
     */
    public draw(useTriangles: boolean, indexStart: number, indexCount: number, instancesCount?: number): void {
        this.drawElementsType(useTriangles ? Constants.MATERIAL_TriangleFillMode : Constants.MATERIAL_WireFrameFillMode, indexStart, indexCount, instancesCount);
    }

    /**
     * Draw a list of points
     * @param verticesStart defines the index of first vertex to draw
     * @param verticesCount defines the count of vertices to draw
     * @param instancesCount defines the number of instances to draw (if instantiation is enabled)
     */
    public drawPointClouds(verticesStart: number, verticesCount: number, instancesCount?: number): void {
        this.drawArraysType(Constants.MATERIAL_PointFillMode, verticesStart, verticesCount, instancesCount);
    }

    /**
     * Draw a list of unindexed primitives
     * @param useTriangles defines if triangles must be used to draw (else wireframe will be used)
     * @param verticesStart defines the index of first vertex to draw
     * @param verticesCount defines the count of vertices to draw
     * @param instancesCount defines the number of instances to draw (if instantiation is enabled)
     */
    public drawUnIndexed(useTriangles: boolean, verticesStart: number, verticesCount: number, instancesCount?: number): void {
        this.drawArraysType(useTriangles ? Constants.MATERIAL_TriangleFillMode : Constants.MATERIAL_WireFrameFillMode, verticesStart, verticesCount, instancesCount);
    }

    /**
     * Draw a list of indexed primitives
     * @param fillMode defines the primitive to use
     * @param indexStart defines the starting index
     * @param indexCount defines the number of index to draw
     * @param instancesCount defines the number of instances to draw (if instantiation is enabled)
     */
    public drawElementsType(fillMode: number, indexStart: number, indexCount: number, instancesCount?: number): void {
        // Apply states
        this.applyStates();

        this._reportDrawCall();

        // Render

        const drawMode = this._drawMode(fillMode);
        const indexFormat = this._uintIndicesCurrentlySet ? this._gl.UNSIGNED_INT : this._gl.UNSIGNED_SHORT;
        const mult = this._uintIndicesCurrentlySet ? 4 : 2;
        if (instancesCount) {
            this._gl.drawElementsInstanced(drawMode, indexCount, indexFormat, indexStart * mult, instancesCount);
        } else {
            this._gl.drawElements(drawMode, indexCount, indexFormat, indexStart * mult);
        }
    }

    /**
     * Draw a list of unindexed primitives
     * @param fillMode defines the primitive to use
     * @param verticesStart defines the index of first vertex to draw
     * @param verticesCount defines the count of vertices to draw
     * @param instancesCount defines the number of instances to draw (if instantiation is enabled)
     */
    public drawArraysType(fillMode: number, verticesStart: number, verticesCount: number, instancesCount?: number): void {
        // Apply states
        this.applyStates();

        this._reportDrawCall();

        const drawMode = this._drawMode(fillMode);
        if (instancesCount) {
            this._gl.drawArraysInstanced(drawMode, verticesStart, verticesCount, instancesCount);
        } else {
            this._gl.drawArrays(drawMode, verticesStart, verticesCount);
        }
    }

    private _drawMode(fillMode: number): number {
        switch (fillMode) {
            // Triangle views
            case Constants.MATERIAL_TriangleFillMode:
                return this._gl.TRIANGLES;
            case Constants.MATERIAL_PointFillMode:
                return this._gl.POINTS;
            case Constants.MATERIAL_WireFrameFillMode:
                return this._gl.LINES;
            // Draw modes
            case Constants.MATERIAL_PointListDrawMode:
                return this._gl.POINTS;
            case Constants.MATERIAL_LineListDrawMode:
                return this._gl.LINES;
            case Constants.MATERIAL_LineLoopDrawMode:
                return this._gl.LINE_LOOP;
            case Constants.MATERIAL_LineStripDrawMode:
                return this._gl.LINE_STRIP;
            case Constants.MATERIAL_TriangleStripDrawMode:
                return this._gl.TRIANGLE_STRIP;
            case Constants.MATERIAL_TriangleFanDrawMode:
                return this._gl.TRIANGLE_FAN;
            default:
                return this._gl.TRIANGLES;
        }
    }

    // Shaders

    /**
     * @internal
     */
    public _releaseEffect(effect: Effect): void {
        if (this._compiledEffects[effect._key]) {
            delete this._compiledEffects[effect._key];
        }
        const pipelineContext = effect.getPipelineContext();
        if (pipelineContext) {
            this._deletePipelineContext(pipelineContext);
        }
    }

    /**
     * @internal
     */
    public _deletePipelineContext(pipelineContext: IPipelineContext): void {
        const webGLPipelineContext = pipelineContext as WebGLPipelineContext;
        if (webGLPipelineContext && webGLPipelineContext.program) {
            webGLPipelineContext.program.__SPECTOR_rebuildProgram = null;
            resetCachedPipeline(webGLPipelineContext);
            if (this._gl) {
                if (this._currentProgram === webGLPipelineContext.program) {
                    this._setProgram(null);
                }
                this._gl.deleteProgram(webGLPipelineContext.program);
            }
        }
    }

    /**
     * @internal
     */
    public override _getGlobalDefines(defines?: { [key: string]: string }): string | undefined {
        return _GetGlobalDefines(defines, this.isNDCHalfZRange, this.useReverseDepthBuffer, this.useExactSrgbConversions);
    }

    /**
     * Create a new effect (used to store vertex/fragment shaders)
     * @param baseName defines the base name of the effect (The name of file without .fragment.fx or .vertex.fx)
     * @param attributesNamesOrOptions defines either a list of attribute names or an IEffectCreationOptions object
     * @param uniformsNamesOrEngine defines either a list of uniform names or the engine to use
     * @param samplers defines an array of string used to represent textures
     * @param defines defines the string containing the defines to use to compile the shaders
     * @param fallbacks defines the list of potential fallbacks to use if shader compilation fails
     * @param onCompiled defines a function to call when the effect creation is successful
     * @param onError defines a function to call when the effect creation has failed
     * @param indexParameters defines an object containing the index values to use to compile shaders (like the maximum number of simultaneous lights)
     * @param shaderLanguage the language the shader is written in (default: GLSL)
     * @param extraInitializationsAsync additional async code to run before preparing the effect
     * @returns the new Effect
     */
    public createEffect(
        baseName: string | (IShaderPath & { vertexToken?: string; fragmentToken?: string }),
        attributesNamesOrOptions: string[] | IEffectCreationOptions,
        uniformsNamesOrEngine: string[] | ThinEngine,
        samplers?: string[],
        defines?: string,
        fallbacks?: IEffectFallbacks,
        onCompiled?: Nullable<(effect: Effect) => void>,
        onError?: Nullable<(effect: Effect, errors: string) => void>,
        indexParameters?: any,
        shaderLanguage = ShaderLanguage.GLSL,
        extraInitializationsAsync?: () => Promise<void>
    ): Effect {
        const vertex = typeof baseName === "string" ? baseName : baseName.vertexToken || baseName.vertexSource || baseName.vertexElement || baseName.vertex;
        const fragment = typeof baseName === "string" ? baseName : baseName.fragmentToken || baseName.fragmentSource || baseName.fragmentElement || baseName.fragment;
        const globalDefines = this._getGlobalDefines()!;

        const isOptions = (attributesNamesOrOptions as IEffectCreationOptions).attributes !== undefined;

        let fullDefines = defines ?? (<IEffectCreationOptions>attributesNamesOrOptions).defines ?? "";

        if (globalDefines) {
            fullDefines += globalDefines;
        }

        const name = vertex + "+" + fragment + "@" + fullDefines;
        if (this._compiledEffects[name]) {
            const compiledEffect = this._compiledEffects[name];
            if (onCompiled && compiledEffect.isReady()) {
                onCompiled(compiledEffect);
            }
            compiledEffect._refCount++;
            return compiledEffect;
        }
        if (this._gl) {
            getStateObject(this._gl);
        }
        const effect = new Effect(
            baseName,
            attributesNamesOrOptions,
            isOptions ? this : uniformsNamesOrEngine,
            samplers,
            this,
            defines,
            fallbacks,
            onCompiled,
            onError,
            indexParameters,
            name,
            (<IEffectCreationOptions>attributesNamesOrOptions).shaderLanguage ?? shaderLanguage,
            (<IEffectCreationOptions>attributesNamesOrOptions).extraInitializationsAsync ?? extraInitializationsAsync
        );
        this._compiledEffects[name] = effect;

        return effect;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected static _ConcatenateShader = _ConcatenateShader;

    /**
     * @internal
     */
    public _getShaderSource(shader: WebGLShader): Nullable<string> {
        return this._gl.getShaderSource(shader);
    }

    /**
     * Directly creates a webGL program
     * @param pipelineContext  defines the pipeline context to attach to
     * @param vertexCode defines the vertex shader code to use
     * @param fragmentCode defines the fragment shader code to use
     * @param context defines the webGL context to use (if not set, the current one will be used)
     * @param transformFeedbackVaryings defines the list of transform feedback varyings to use
     * @returns the new webGL program
     */
    public createRawShaderProgram(
        pipelineContext: IPipelineContext,
        vertexCode: string,
        fragmentCode: string,
        context?: WebGLRenderingContext,
        transformFeedbackVaryings: Nullable<string[]> = null
    ): WebGLProgram {
        const stateObject = getStateObject(this._gl);
        stateObject._contextWasLost = this._contextWasLost;
        stateObject.validateShaderPrograms = this.validateShaderPrograms;
        return createRawShaderProgram(pipelineContext, vertexCode, fragmentCode, context || this._gl, transformFeedbackVaryings);
    }

    /**
     * Creates a webGL program
     * @param pipelineContext  defines the pipeline context to attach to
     * @param vertexCode  defines the vertex shader code to use
     * @param fragmentCode defines the fragment shader code to use
     * @param defines defines the string containing the defines to use to compile the shaders
     * @param context defines the webGL context to use (if not set, the current one will be used)
     * @param transformFeedbackVaryings defines the list of transform feedback varyings to use
     * @returns the new webGL program
     */
    public createShaderProgram(
        pipelineContext: IPipelineContext,
        vertexCode: string,
        fragmentCode: string,
        defines: Nullable<string>,
        context?: WebGLRenderingContext,
        transformFeedbackVaryings: Nullable<string[]> = null
    ): WebGLProgram {
        const stateObject = getStateObject(this._gl);
        // assure the state object is correct
        stateObject._contextWasLost = this._contextWasLost;
        stateObject.validateShaderPrograms = this.validateShaderPrograms;
        return createShaderProgram(pipelineContext, vertexCode, fragmentCode, defines, context || this._gl, transformFeedbackVaryings);
    }

    /**
     * Inline functions in shader code that are marked to be inlined
     * @param code code to inline
     * @returns inlined code
     */
    public inlineShaderCode(code: string): string {
        // no inlining needed in the WebGL engine
        return code;
    }

    /**
     * Creates a new pipeline context
     * @param shaderProcessingContext defines the shader processing context used during the processing if available
     * @returns the new pipeline
     */
    public createPipelineContext(shaderProcessingContext: Nullable<_IShaderProcessingContext>): IPipelineContext {
        if (this._gl) {
            const stateObject = getStateObject(this._gl);
            stateObject.parallelShaderCompile = this._caps.parallelShaderCompile;
        }
        const context = createPipelineContext(this._gl, shaderProcessingContext) as WebGLPipelineContext;
        context.engine = this;
        return context;
    }

    /**
     * Creates a new material context
     * @returns the new context
     */
    public createMaterialContext(): IMaterialContext | undefined {
        return undefined;
    }

    /**
     * Creates a new draw context
     * @returns the new context
     */
    public createDrawContext(): IDrawContext | undefined {
        return undefined;
    }

    protected _finalizePipelineContext(pipelineContext: WebGLPipelineContext) {
        return _finalizePipelineContext(pipelineContext, this._gl, this.validateShaderPrograms);
    }

    /**
     * @internal
     */
    // named async but not actually an async function
    // eslint-disable-next-line no-restricted-syntax
    public _preparePipelineContextAsync(
        pipelineContext: IPipelineContext,
        vertexSourceCode: string,
        fragmentSourceCode: string,
        createAsRaw: boolean,
        rawVertexSourceCode: string,
        rawFragmentSourceCode: string,
        rebuildRebind: any,
        defines: Nullable<string>,
        transformFeedbackVaryings: Nullable<string[]>,
        key: string,
        onReady: () => void
    ) {
        const stateObject = getStateObject(this._gl);
        stateObject._contextWasLost = this._contextWasLost;
        stateObject.validateShaderPrograms = this.validateShaderPrograms;
        stateObject._createShaderProgramInjection = this._createShaderProgram.bind(this);
        stateObject.createRawShaderProgramInjection = this.createRawShaderProgram.bind(this);
        stateObject.createShaderProgramInjection = this.createShaderProgram.bind(this);
        stateObject.loadFileInjection = this._loadFile.bind(this);
        return _preparePipelineContext(
            pipelineContext as WebGLPipelineContext,
            vertexSourceCode,
            fragmentSourceCode,
            createAsRaw,
            rawVertexSourceCode,
            rawFragmentSourceCode,
            rebuildRebind,
            defines,
            transformFeedbackVaryings,
            key,
            onReady
        );
    }

    protected _createShaderProgram(
        pipelineContext: WebGLPipelineContext,
        vertexShader: WebGLShader,
        fragmentShader: WebGLShader,
        context: WebGLRenderingContext,
        transformFeedbackVaryings: Nullable<string[]> = null
    ): WebGLProgram {
        return _createShaderProgram(pipelineContext, vertexShader, fragmentShader, context, transformFeedbackVaryings);
    }

    /**
     * @internal
     */
    public _isRenderingStateCompiled(pipelineContext: IPipelineContext): boolean {
        if (this._isDisposed) {
            return false;
        }
        return _isRenderingStateCompiled(pipelineContext, this._gl, this.validateShaderPrograms);
    }

    /**
     * @internal
     */
    public _executeWhenRenderingStateIsCompiled(pipelineContext: IPipelineContext, action: () => void) {
        _executeWhenRenderingStateIsCompiled(pipelineContext as WebGLPipelineContext, action);
    }

    /**
     * Gets the list of webGL uniform locations associated with a specific program based on a list of uniform names
     * @param pipelineContext defines the pipeline context to use
     * @param uniformsNames defines the list of uniform names
     * @returns an array of webGL uniform locations
     */
    public getUniforms(pipelineContext: IPipelineContext, uniformsNames: string[]): Nullable<WebGLUniformLocation>[] {
        const results = new Array<Nullable<WebGLUniformLocation>>();
        const webGLPipelineContext = pipelineContext as WebGLPipelineContext;

        for (let index = 0; index < uniformsNames.length; index++) {
            results.push(this._gl.getUniformLocation(webGLPipelineContext.program!, uniformsNames[index]));
        }

        return results;
    }

    /**
     * Gets the list of active attributes for a given webGL program
     * @param pipelineContext defines the pipeline context to use
     * @param attributesNames defines the list of attribute names to get
     * @returns an array of indices indicating the offset of each attribute
     */
    public getAttributes(pipelineContext: IPipelineContext, attributesNames: string[]): number[] {
        const results = [];
        const webGLPipelineContext = pipelineContext as WebGLPipelineContext;

        for (let index = 0; index < attributesNames.length; index++) {
            try {
                results.push(this._gl.getAttribLocation(webGLPipelineContext.program!, attributesNames[index]));
            } catch (e) {
                results.push(-1);
            }
        }

        return results;
    }

    /**
     * Activates an effect, making it the current one (ie. the one used for rendering)
     * @param effect defines the effect to activate
     */
    public enableEffect(effect: Nullable<Effect | DrawWrapper>): void {
        effect = effect !== null && IsWrapper(effect) ? effect.effect : effect; // get only the effect, we don't need a Wrapper in the WebGL engine

        if (!effect || effect === this._currentEffect) {
            return;
        }

        this._stencilStateComposer.stencilMaterial = undefined;

        // Use program
        this.bindSamplers(effect);

        this._currentEffect = effect;

        if (effect.onBind) {
            effect.onBind(effect);
        }
        if (effect._onBindObservable) {
            effect._onBindObservable.notifyObservers(effect);
        }
    }

    /**
     * Set the value of an uniform to a number (int)
     * @param uniform defines the webGL uniform location where to store the value
     * @param value defines the int number to store
     * @returns true if the value was set
     */
    public setInt(uniform: Nullable<WebGLUniformLocation>, value: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform1i(uniform, value);

        return true;
    }

    /**
     * Set the value of an uniform to a int2
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @returns true if the value was set
     */
    public setInt2(uniform: Nullable<WebGLUniformLocation>, x: number, y: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform2i(uniform, x, y);

        return true;
    }

    /**
     * Set the value of an uniform to a int3
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @param z defines the 3rd component of the value
     * @returns true if the value was set
     */
    public setInt3(uniform: Nullable<WebGLUniformLocation>, x: number, y: number, z: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform3i(uniform, x, y, z);

        return true;
    }

    /**
     * Set the value of an uniform to a int4
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @param z defines the 3rd component of the value
     * @param w defines the 4th component of the value
     * @returns true if the value was set
     */
    public setInt4(uniform: Nullable<WebGLUniformLocation>, x: number, y: number, z: number, w: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform4i(uniform, x, y, z, w);

        return true;
    }

    /**
     * Set the value of an uniform to an array of int32
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of int32 to store
     * @returns true if the value was set
     */
    public setIntArray(uniform: Nullable<WebGLUniformLocation>, array: Int32Array): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform1iv(uniform, array);

        return true;
    }

    /**
     * Set the value of an uniform to an array of int32 (stored as vec2)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of int32 to store
     * @returns true if the value was set
     */
    public setIntArray2(uniform: Nullable<WebGLUniformLocation>, array: Int32Array): boolean {
        if (!uniform || array.length % 2 !== 0) {
            return false;
        }

        this._gl.uniform2iv(uniform, array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of int32 (stored as vec3)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of int32 to store
     * @returns true if the value was set
     */
    public setIntArray3(uniform: Nullable<WebGLUniformLocation>, array: Int32Array): boolean {
        if (!uniform || array.length % 3 !== 0) {
            return false;
        }

        this._gl.uniform3iv(uniform, array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of int32 (stored as vec4)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of int32 to store
     * @returns true if the value was set
     */
    public setIntArray4(uniform: Nullable<WebGLUniformLocation>, array: Int32Array): boolean {
        if (!uniform || array.length % 4 !== 0) {
            return false;
        }

        this._gl.uniform4iv(uniform, array);
        return true;
    }

    /**
     * Set the value of an uniform to a number (unsigned int)
     * @param uniform defines the webGL uniform location where to store the value
     * @param value defines the unsigned int number to store
     * @returns true if the value was set
     */
    public setUInt(uniform: Nullable<WebGLUniformLocation>, value: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform1ui(uniform, value);

        return true;
    }

    /**
     * Set the value of an uniform to a unsigned int2
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @returns true if the value was set
     */
    public setUInt2(uniform: Nullable<WebGLUniformLocation>, x: number, y: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform2ui(uniform, x, y);

        return true;
    }

    /**
     * Set the value of an uniform to a unsigned int3
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @param z defines the 3rd component of the value
     * @returns true if the value was set
     */
    public setUInt3(uniform: Nullable<WebGLUniformLocation>, x: number, y: number, z: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform3ui(uniform, x, y, z);

        return true;
    }

    /**
     * Set the value of an uniform to a unsigned int4
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @param z defines the 3rd component of the value
     * @param w defines the 4th component of the value
     * @returns true if the value was set
     */
    public setUInt4(uniform: Nullable<WebGLUniformLocation>, x: number, y: number, z: number, w: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform4ui(uniform, x, y, z, w);

        return true;
    }

    /**
     * Set the value of an uniform to an array of unsigned int32
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of unsigned int32 to store
     * @returns true if the value was set
     */
    public setUIntArray(uniform: Nullable<WebGLUniformLocation>, array: Uint32Array): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform1uiv(uniform, array);

        return true;
    }

    /**
     * Set the value of an uniform to an array of unsigned int32 (stored as vec2)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of unsigned int32 to store
     * @returns true if the value was set
     */
    public setUIntArray2(uniform: Nullable<WebGLUniformLocation>, array: Uint32Array): boolean {
        if (!uniform || array.length % 2 !== 0) {
            return false;
        }

        this._gl.uniform2uiv(uniform, array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of unsigned int32 (stored as vec3)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of unsigned int32 to store
     * @returns true if the value was set
     */
    public setUIntArray3(uniform: Nullable<WebGLUniformLocation>, array: Uint32Array): boolean {
        if (!uniform || array.length % 3 !== 0) {
            return false;
        }

        this._gl.uniform3uiv(uniform, array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of unsigned int32 (stored as vec4)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of unsigned int32 to store
     * @returns true if the value was set
     */
    public setUIntArray4(uniform: Nullable<WebGLUniformLocation>, array: Uint32Array): boolean {
        if (!uniform || array.length % 4 !== 0) {
            return false;
        }

        this._gl.uniform4uiv(uniform, array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of number
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of number to store
     * @returns true if the value was set
     */
    public setArray(uniform: Nullable<WebGLUniformLocation>, array: FloatArray): boolean {
        if (!uniform) {
            return false;
        }

        if (array.length < 1) {
            return false;
        }
        this._gl.uniform1fv(uniform, array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of number (stored as vec2)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of number to store
     * @returns true if the value was set
     */
    public setArray2(uniform: Nullable<WebGLUniformLocation>, array: FloatArray): boolean {
        if (!uniform || array.length % 2 !== 0) {
            return false;
        }

        this._gl.uniform2fv(uniform, <any>array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of number (stored as vec3)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of number to store
     * @returns true if the value was set
     */
    public setArray3(uniform: Nullable<WebGLUniformLocation>, array: FloatArray): boolean {
        if (!uniform || array.length % 3 !== 0) {
            return false;
        }

        this._gl.uniform3fv(uniform, <any>array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of number (stored as vec4)
     * @param uniform defines the webGL uniform location where to store the value
     * @param array defines the array of number to store
     * @returns true if the value was set
     */
    public setArray4(uniform: Nullable<WebGLUniformLocation>, array: FloatArray): boolean {
        if (!uniform || array.length % 4 !== 0) {
            return false;
        }

        this._gl.uniform4fv(uniform, <any>array);
        return true;
    }

    /**
     * Set the value of an uniform to an array of float32 (stored as matrices)
     * @param uniform defines the webGL uniform location where to store the value
     * @param matrices defines the array of float32 to store
     * @returns true if the value was set
     */
    public setMatrices(uniform: Nullable<WebGLUniformLocation>, matrices: DeepImmutable<FloatArray>): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniformMatrix4fv(uniform, false, matrices);
        return true;
    }

    /**
     * Set the value of an uniform to a matrix (3x3)
     * @param uniform defines the webGL uniform location where to store the value
     * @param matrix defines the Float32Array representing the 3x3 matrix to store
     * @returns true if the value was set
     */
    public setMatrix3x3(uniform: Nullable<WebGLUniformLocation>, matrix: Float32Array): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniformMatrix3fv(uniform, false, matrix);
        return true;
    }

    /**
     * Set the value of an uniform to a matrix (2x2)
     * @param uniform defines the webGL uniform location where to store the value
     * @param matrix defines the Float32Array representing the 2x2 matrix to store
     * @returns true if the value was set
     */
    public setMatrix2x2(uniform: Nullable<WebGLUniformLocation>, matrix: Float32Array): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniformMatrix2fv(uniform, false, matrix);
        return true;
    }

    /**
     * Set the value of an uniform to a number (float)
     * @param uniform defines the webGL uniform location where to store the value
     * @param value defines the float number to store
     * @returns true if the value was transferred
     */
    public setFloat(uniform: Nullable<WebGLUniformLocation>, value: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform1f(uniform, value);

        return true;
    }

    /**
     * Set the value of an uniform to a vec2
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @returns true if the value was set
     */
    public setFloat2(uniform: Nullable<WebGLUniformLocation>, x: number, y: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform2f(uniform, x, y);

        return true;
    }

    /**
     * Set the value of an uniform to a vec3
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @param z defines the 3rd component of the value
     * @returns true if the value was set
     */
    public setFloat3(uniform: Nullable<WebGLUniformLocation>, x: number, y: number, z: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform3f(uniform, x, y, z);

        return true;
    }

    /**
     * Set the value of an uniform to a vec4
     * @param uniform defines the webGL uniform location where to store the value
     * @param x defines the 1st component of the value
     * @param y defines the 2nd component of the value
     * @param z defines the 3rd component of the value
     * @param w defines the 4th component of the value
     * @returns true if the value was set
     */
    public setFloat4(uniform: Nullable<WebGLUniformLocation>, x: number, y: number, z: number, w: number): boolean {
        if (!uniform) {
            return false;
        }

        this._gl.uniform4f(uniform, x, y, z, w);

        return true;
    }

    // States

    /**
     * Apply all cached states (depth, culling, stencil and alpha)
     */
    public applyStates() {
        this._depthCullingState.apply(this._gl);
        this._stencilStateComposer.apply(this._gl);
        this._alphaState.apply(this._gl, this._currentRenderTarget && this._currentRenderTarget.textures ? this._currentRenderTarget.textures!.length : 1);

        if (this._colorWriteChanged) {
            this._colorWriteChanged = false;
            const enable = this._colorWrite;
            this._gl.colorMask(enable, enable, enable, enable);
        }
    }

    // Textures

    /**
     * Force the entire cache to be cleared
     * You should not have to use this function unless your engine needs to share the webGL context with another engine
     * @param bruteForce defines a boolean to force clearing ALL caches (including stencil, detoh and alpha states)
     */
    public wipeCaches(bruteForce?: boolean): void {
        if (this.preventCacheWipeBetweenFrames && !bruteForce) {
            return;
        }
        this._currentEffect = null;
        this._viewportCached.x = 0;
        this._viewportCached.y = 0;
        this._viewportCached.z = 0;
        this._viewportCached.w = 0;

        // Done before in case we clean the attributes
        this._unbindVertexArrayObject();

        if (bruteForce) {
            this._currentProgram = null;
            this.resetTextureCache();

            this._stencilStateComposer.reset();

            this._depthCullingState.reset();
            this._depthCullingState.depthFunc = this._gl.LEQUAL;

            this._alphaState.reset();
            this._resetAlphaMode();

            this._colorWrite = true;
            this._colorWriteChanged = true;

            this._unpackFlipYCached = null;

            this._gl.pixelStorei(this._gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, this._gl.NONE);
            this._gl.pixelStorei(this._gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);

            this._mustWipeVertexAttributes = true;
            this.unbindAllAttributes();
        }

        this._resetVertexBufferBinding();
        this._cachedIndexBuffer = null;
        this._cachedEffectForVertexBuffers = null;
        this.bindIndexBuffer(null);
    }

    /**
     * @internal
     */
    public _getSamplingParameters(samplingMode: number, generateMipMaps: boolean): { min: number; mag: number; hasMipMaps: boolean } {
        const gl = this._gl;
        let magFilter: GLenum = gl.NEAREST;
        let minFilter: GLenum = gl.NEAREST;
        let hasMipMaps = false;

        switch (samplingMode) {
            case Constants.TEXTURE_LINEAR_LINEAR_MIPNEAREST:
                magFilter = gl.LINEAR;
                if (generateMipMaps) {
                    minFilter = gl.LINEAR_MIPMAP_NEAREST;
                } else {
                    minFilter = gl.LINEAR;
                }
                break;
            case Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR:
                magFilter = gl.LINEAR;
                hasMipMaps = true;
                if (generateMipMaps) {
                    minFilter = gl.LINEAR_MIPMAP_LINEAR;
                } else {
                    minFilter = gl.LINEAR;
                }
                break;
            case Constants.TEXTURE_NEAREST_NEAREST_MIPLINEAR:
                hasMipMaps = true;
                magFilter = gl.NEAREST;
                if (generateMipMaps) {
                    minFilter = gl.NEAREST_MIPMAP_LINEAR;
                } else {
                    minFilter = gl.NEAREST;
                }
                break;
            case Constants.TEXTURE_NEAREST_NEAREST_MIPNEAREST:
                magFilter = gl.NEAREST;
                if (generateMipMaps) {
                    minFilter = gl.NEAREST_MIPMAP_NEAREST;
                } else {
                    minFilter = gl.NEAREST;
                }
                break;
            case Constants.TEXTURE_NEAREST_LINEAR_MIPNEAREST:
                magFilter = gl.NEAREST;
                if (generateMipMaps) {
                    minFilter = gl.LINEAR_MIPMAP_NEAREST;
                } else {
                    minFilter = gl.LINEAR;
                }
                break;
            case Constants.TEXTURE_NEAREST_LINEAR_MIPLINEAR:
                hasMipMaps = true;
                magFilter = gl.NEAREST;
                if (generateMipMaps) {
                    minFilter = gl.LINEAR_MIPMAP_LINEAR;
                } else {
                    minFilter = gl.LINEAR;
                }
                break;
            case Constants.TEXTURE_NEAREST_LINEAR:
                magFilter = gl.NEAREST;
                minFilter = gl.LINEAR;
                break;
            case Constants.TEXTURE_NEAREST_NEAREST:
                magFilter = gl.NEAREST;
                minFilter = gl.NEAREST;
                break;
            case Constants.TEXTURE_LINEAR_NEAREST_MIPNEAREST:
                magFilter = gl.LINEAR;
                if (generateMipMaps) {
                    minFilter = gl.NEAREST_MIPMAP_NEAREST;
                } else {
                    minFilter = gl.NEAREST;
                }
                break;
            case Constants.TEXTURE_LINEAR_NEAREST_MIPLINEAR:
                hasMipMaps = true;
                magFilter = gl.LINEAR;
                if (generateMipMaps) {
                    minFilter = gl.NEAREST_MIPMAP_LINEAR;
                } else {
                    minFilter = gl.NEAREST;
                }
                break;
            case Constants.TEXTURE_LINEAR_LINEAR:
                magFilter = gl.LINEAR;
                minFilter = gl.LINEAR;
                break;
            case Constants.TEXTURE_LINEAR_NEAREST:
                magFilter = gl.LINEAR;
                minFilter = gl.NEAREST;
                break;
        }

        return {
            min: minFilter,
            mag: magFilter,
            hasMipMaps: hasMipMaps,
        };
    }

    /** @internal */
    protected _createTexture(): WebGLTexture {
        const texture = this._gl.createTexture();

        if (!texture) {
            throw new Error("Unable to create texture");
        }

        return texture;
    }

    /** @internal */
    public _createHardwareTexture(): IHardwareTextureWrapper {
        return new WebGLHardwareTexture(this._createTexture(), this._gl);
    }

    /**
     * Creates an internal texture without binding it to a framebuffer
     * @internal
     * @param size defines the size of the texture
     * @param options defines the options used to create the texture
     * @param delayGPUTextureCreation true to delay the texture creation the first time it is really needed. false to create it right away
     * @param source source type of the texture
     * @returns a new internal texture
     */
    public _createInternalTexture(
        size: TextureSize,
        options: boolean | InternalTextureCreationOptions,
        delayGPUTextureCreation = true,
        source = InternalTextureSource.Unknown
    ): InternalTexture {
        let generateMipMaps = false;
        let createMipMaps = false;
        let type = Constants.TEXTURETYPE_UNSIGNED_BYTE;
        let samplingMode = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE;
        let format = Constants.TEXTUREFORMAT_RGBA;
        let useSRGBBuffer = false;
        let samples = 1;
        let label: string | undefined;
        let createMSAATexture = false;
        let comparisonFunction = 0;
        if (options !== undefined && typeof options === "object") {
            generateMipMaps = !!options.generateMipMaps;
            createMipMaps = !!options.createMipMaps;
            type = options.type === undefined ? Constants.TEXTURETYPE_UNSIGNED_BYTE : options.type;
            samplingMode = options.samplingMode === undefined ? Constants.TEXTURE_TRILINEAR_SAMPLINGMODE : options.samplingMode;
            format = options.format === undefined ? Constants.TEXTUREFORMAT_RGBA : options.format;
            useSRGBBuffer = options.useSRGBBuffer === undefined ? false : options.useSRGBBuffer;
            samples = options.samples ?? 1;
            label = options.label;
            createMSAATexture = !!options.createMSAATexture;
            comparisonFunction = options.comparisonFunction || 0;
        } else {
            generateMipMaps = !!options;
        }

        useSRGBBuffer &&= this._caps.supportSRGBBuffers && (this.webGLVersion > 1 || this.isWebGPU);

        if (type === Constants.TEXTURETYPE_FLOAT && !this._caps.textureFloatLinearFiltering) {
            // if floating point linear (gl.FLOAT) then force to NEAREST_SAMPLINGMODE
            samplingMode = Constants.TEXTURE_NEAREST_SAMPLINGMODE;
        } else if (type === Constants.TEXTURETYPE_HALF_FLOAT && !this._caps.textureHalfFloatLinearFiltering) {
            // if floating point linear (HALF_FLOAT) then force to NEAREST_SAMPLINGMODE
            samplingMode = Constants.TEXTURE_NEAREST_SAMPLINGMODE;
        }
        if (type === Constants.TEXTURETYPE_FLOAT && !this._caps.textureFloat) {
            type = Constants.TEXTURETYPE_UNSIGNED_BYTE;
            Logger.Warn("Float textures are not supported. Type forced to TEXTURETYPE_UNSIGNED_BYTE");
        }

        const isDepthTexture = IsDepthTexture(format);
        const hasStencil = HasStencilAspect(format);

        const gl = this._gl;
        const texture = new InternalTexture(this, source);
        const width = (<{ width: number; height: number; depth?: number; layers?: number }>size).width || <number>size;
        const height = (<{ width: number; height: number; depth?: number; layers?: number }>size).height || <number>size;
        const depth = (<{ width: number; height: number; depth?: number; layers?: number }>size).depth || 0;
        const layers = (<{ width: number; height: number; depth?: number; layers?: number }>size).layers || 0;
        const filters = this._getSamplingParameters(samplingMode, (generateMipMaps || createMipMaps) && !isDepthTexture);
        const target = layers !== 0 ? gl.TEXTURE_2D_ARRAY : depth !== 0 ? gl.TEXTURE_3D : gl.TEXTURE_2D;
        const sizedFormat = isDepthTexture
            ? this._getInternalFormatFromDepthTextureFormat(format, true, hasStencil)
            : this._getRGBABufferInternalSizedFormat(type, format, useSRGBBuffer);
        const internalFormat = isDepthTexture ? (hasStencil ? gl.DEPTH_STENCIL : gl.DEPTH_COMPONENT) : this._getInternalFormat(format);
        const textureType = isDepthTexture ? this._getWebGLTextureTypeFromDepthTextureFormat(format) : this._getWebGLTextureType(type);

        // Bind
        this._bindTextureDirectly(target, texture);

        if (layers !== 0) {
            texture.is2DArray = true;
            gl.texImage3D(target, 0, sizedFormat, width, height, layers, 0, internalFormat, textureType, null);
        } else if (depth !== 0) {
            texture.is3D = true;
            gl.texImage3D(target, 0, sizedFormat, width, height, depth, 0, internalFormat, textureType, null);
        } else {
            gl.texImage2D(target, 0, sizedFormat, width, height, 0, internalFormat, textureType, null);
        }

        gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, filters.mag);
        gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, filters.min);
        gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        if (isDepthTexture && this.webGLVersion > 1) {
            if (comparisonFunction === 0) {
                gl.texParameteri(target, gl.TEXTURE_COMPARE_FUNC, Constants.LEQUAL);
                gl.texParameteri(target, gl.TEXTURE_COMPARE_MODE, gl.NONE);
            } else {
                gl.texParameteri(target, gl.TEXTURE_COMPARE_FUNC, comparisonFunction);
                gl.texParameteri(target, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
            }
        }

        // MipMaps
        if (generateMipMaps || createMipMaps) {
            this._gl.generateMipmap(target);
        }

        this._bindTextureDirectly(target, null);

        texture._useSRGBBuffer = useSRGBBuffer;
        texture.baseWidth = width;
        texture.baseHeight = height;
        texture.width = width;
        texture.height = height;
        texture.depth = layers || depth;
        texture.isReady = true;
        texture.samples = samples;
        texture.generateMipMaps = generateMipMaps;
        texture.samplingMode = samplingMode;
        texture.type = type;
        texture.format = format;
        texture.label = label;
        texture.comparisonFunction = comparisonFunction;

        this._internalTexturesCache.push(texture);

        if (createMSAATexture) {
            let renderBuffer: Nullable<WebGLRenderbuffer> = null;

            if (IsDepthTexture(texture.format)) {
                renderBuffer = this._setupFramebufferDepthAttachments(
                    HasStencilAspect(texture.format),
                    texture.format !== Constants.TEXTUREFORMAT_STENCIL8,
                    texture.width,
                    texture.height,
                    samples,
                    texture.format,
                    true
                );
            } else {
                renderBuffer = this._createRenderBuffer(
                    texture.width,
                    texture.height,
                    samples,
                    -1 /* not used */,
                    this._getRGBABufferInternalSizedFormat(texture.type, texture.format, texture._useSRGBBuffer),
                    -1 /* attachment */
                );
            }

            if (!renderBuffer) {
                throw new Error("Unable to create render buffer");
            }

            texture._autoMSAAManagement = true;

            let hardwareTexture = texture._hardwareTexture as Nullable<WebGLHardwareTexture>;
            if (!hardwareTexture) {
                hardwareTexture = texture._hardwareTexture = this._createHardwareTexture() as WebGLHardwareTexture;
            }

            hardwareTexture.addMSAARenderBuffer(renderBuffer);
        }

        return texture;
    }

    /**
     * @internal
     */
    public _getUseSRGBBuffer(useSRGBBuffer: boolean, noMipmap: boolean): boolean {
        // Generating mipmaps for sRGB textures is not supported in WebGL1 so we must disable the support if mipmaps is enabled
        return useSRGBBuffer && this._caps.supportSRGBBuffers && (this.webGLVersion > 1 || noMipmap);
    }

    /**
     * Usually called from Texture.ts.
     * Passed information to create a WebGLTexture
     * @param url defines a value which contains one of the following:
     * * A conventional http URL, e.g. 'http://...' or 'file://...'
     * * A base64 string of in-line texture data, e.g. 'data:image/jpg;base64,/...'
     * * An indicator that data being passed using the buffer parameter, e.g. 'data:mytexture.jpg'
     * @param noMipmap defines a boolean indicating that no mipmaps shall be generated.  Ignored for compressed textures.  They must be in the file
     * @param invertY when true, image is flipped when loaded.  You probably want true. Certain compressed textures may invert this if their default is inverted (eg. ktx)
     * @param scene needed for loading to the correct scene
     * @param samplingMode mode with should be used sample / access the texture (Default: Texture.TRILINEAR_SAMPLINGMODE)
     * @param onLoad optional callback to be called upon successful completion
     * @param onError optional callback to be called upon failure
     * @param buffer a source of a file previously fetched as either a base64 string, an ArrayBuffer (compressed or image format), HTMLImageElement (image format), or a Blob
     * @param fallback an internal argument in case the function must be called again, due to etc1 not having alpha capabilities
     * @param format internal format.  Default: RGB when extension is '.jpg' else RGBA.  Ignored for compressed textures
     * @param forcedExtension defines the extension to use to pick the right loader
     * @param mimeType defines an optional mime type
     * @param loaderOptions options to be passed to the loader
     * @param creationFlags specific flags to use when creating the texture (Constants.TEXTURE_CREATIONFLAG_STORAGE for storage textures, for eg)
     * @param useSRGBBuffer defines if the texture must be loaded in a sRGB GPU buffer (if supported by the GPU).
     * @returns a InternalTexture for assignment back into BABYLON.Texture
     */
    public createTexture(
        url: Nullable<string>,
        noMipmap: boolean,
        invertY: boolean,
        scene: Nullable<ISceneLike>,
        samplingMode: number = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE,
        onLoad: Nullable<(texture: InternalTexture) => void> = null,
        onError: Nullable<(message: string, exception: any) => void> = null,
        buffer: Nullable<string | ArrayBuffer | ArrayBufferView | HTMLImageElement | Blob | ImageBitmap> = null,
        fallback: Nullable<InternalTexture> = null,
        format: Nullable<number> = null,
        forcedExtension: Nullable<string> = null,
        mimeType?: string,
        loaderOptions?: any,
        creationFlags?: number,
        useSRGBBuffer?: boolean
    ): InternalTexture {
        return this._createTextureBase(
            url,
            noMipmap,
            invertY,
            scene,
            samplingMode,
            onLoad,
            onError,
            (...args: Parameters<PrepareTextureFunction>) => this._prepareWebGLTexture(...args, format),
            (potWidth, potHeight, img, extension, texture, continuationCallback) => {
                const gl = this._gl;
                const isPot = img.width === potWidth && img.height === potHeight;

                texture._creationFlags = creationFlags ?? 0;

                const tip = this._getTexImageParametersForCreateTexture(texture.format, texture._useSRGBBuffer);
                if (isPot) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, tip.internalFormat, tip.format, tip.type, img as any);
                    return false;
                }

                const maxTextureSize = this._caps.maxTextureSize;

                if (img.width > maxTextureSize || img.height > maxTextureSize || !this._supportsHardwareTextureRescaling) {
                    this._prepareWorkingCanvas();
                    if (!this._workingCanvas || !this._workingContext) {
                        return false;
                    }

                    this._workingCanvas.width = potWidth;
                    this._workingCanvas.height = potHeight;

                    this._workingContext.drawImage(img as any, 0, 0, img.width, img.height, 0, 0, potWidth, potHeight);
                    gl.texImage2D(gl.TEXTURE_2D, 0, tip.internalFormat, tip.format, tip.type, this._workingCanvas as TexImageSource);

                    texture.width = potWidth;
                    texture.height = potHeight;

                    return false;
                } else {
                    // Using shaders when possible to rescale because canvas.drawImage is lossy
                    const source = new InternalTexture(this, InternalTextureSource.Temp);
                    this._bindTextureDirectly(gl.TEXTURE_2D, source, true);
                    gl.texImage2D(gl.TEXTURE_2D, 0, tip.internalFormat, tip.format, tip.type, img as any);

                    this._rescaleTexture(source, texture, scene, tip.format, () => {
                        this._releaseTexture(source);
                        this._bindTextureDirectly(gl.TEXTURE_2D, texture, true);

                        continuationCallback();
                    });
                }

                return true;
            },
            buffer,
            fallback,
            format,
            forcedExtension,
            mimeType,
            loaderOptions,
            useSRGBBuffer
        );
    }

    /**
     * Calls to the GL texImage2D and texImage3D functions require three arguments describing the pixel format of the texture.
     * createTexture derives these from the babylonFormat and useSRGBBuffer arguments and also the file extension of the URL it's working with.
     * This function encapsulates that derivation for easy unit testing.
     * @param babylonFormat Babylon's format enum, as specified in ITextureCreationOptions.
     * @param fileExtension The file extension including the dot, e.g. .jpg.
     * @param useSRGBBuffer Use SRGB not linear.
     * @returns The options to pass to texImage2D or texImage3D calls.
     * @internal
     */
    public _getTexImageParametersForCreateTexture(babylonFormat: number, useSRGBBuffer: boolean): TexImageParameters {
        let format: number, internalFormat: number;
        if (this.webGLVersion === 1) {
            // In WebGL 1, format and internalFormat must be the same and taken from a limited set of values, see https://docs.gl/es2/glTexImage2D.
            // The SRGB extension (https://developer.mozilla.org/en-US/docs/Web/API/EXT_sRGB) adds some extra values, hence passing useSRGBBuffer
            // to getInternalFormat.
            format = this._getInternalFormat(babylonFormat, useSRGBBuffer);
            internalFormat = format;
        } else {
            // In WebGL 2, format has a wider range of values and internal format can be one of the sized formats, see
            // https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glTexImage2D.xhtml.
            // SRGB is included in the sized format and should not be passed in "format", hence always passing useSRGBBuffer as false.
            format = this._getInternalFormat(babylonFormat, false);
            internalFormat = this._getRGBABufferInternalSizedFormat(Constants.TEXTURETYPE_UNSIGNED_BYTE, babylonFormat, useSRGBBuffer);
        }

        return {
            internalFormat,
            format,
            type: this._gl.UNSIGNED_BYTE,
        };
    }

    /**
     * @internal
     */
    public _rescaleTexture(source: InternalTexture, destination: InternalTexture, scene: Nullable<any>, internalFormat: number, onComplete: () => void): void {}

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private _unpackFlipYCached: Nullable<boolean> = null;

    /**
     * In case you are sharing the context with other applications, it might
     * be interested to not cache the unpack flip y state to ensure a consistent
     * value would be set.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public enableUnpackFlipYCached = true;

    /**
     * @internal
     */
    public _unpackFlipY(value: boolean): void {
        if (this._unpackFlipYCached !== value) {
            this._gl.pixelStorei(this._gl.UNPACK_FLIP_Y_WEBGL, value ? 1 : 0);

            if (this.enableUnpackFlipYCached) {
                this._unpackFlipYCached = value;
            }
        }
    }

    /** @internal */
    public _getUnpackAlignement(): number {
        return this._gl.getParameter(this._gl.UNPACK_ALIGNMENT) as number;
    }

    /** @internal */
    public _getTextureTarget(texture: InternalTexture): number {
        if (texture.isCube) {
            return this._gl.TEXTURE_CUBE_MAP;
        } else if (texture.is3D) {
            return this._gl.TEXTURE_3D;
        } else if (texture.is2DArray || texture.isMultiview) {
            return this._gl.TEXTURE_2D_ARRAY;
        }
        return this._gl.TEXTURE_2D;
    }

    /**
     * Update the sampling mode of a given texture
     * @param samplingMode defines the required sampling mode
     * @param texture defines the texture to update
     * @param generateMipMaps defines whether to generate mipmaps for the texture
     */
    public updateTextureSamplingMode(samplingMode: number, texture: InternalTexture, generateMipMaps: boolean = false): void {
        const target = this._getTextureTarget(texture);
        const filters = this._getSamplingParameters(samplingMode, texture.useMipMaps || generateMipMaps);

        this._setTextureParameterInteger(target, this._gl.TEXTURE_MAG_FILTER, filters.mag, texture);
        this._setTextureParameterInteger(target, this._gl.TEXTURE_MIN_FILTER, filters.min);

        if (generateMipMaps && filters.hasMipMaps) {
            texture.generateMipMaps = true;
            this._gl.generateMipmap(target);
        }

        this._bindTextureDirectly(target, null);

        texture.samplingMode = samplingMode;
    }

    /**
     * Update the dimensions of a texture
     * @param texture texture to update
     * @param width new width of the texture
     * @param height new height of the texture
     * @param depth new depth of the texture
     */
    public updateTextureDimensions(texture: InternalTexture, width: number, height: number, depth: number = 1): void {}

    /**
     * Update the sampling mode of a given texture
     * @param texture defines the texture to update
     * @param wrapU defines the texture wrap mode of the u coordinates
     * @param wrapV defines the texture wrap mode of the v coordinates
     * @param wrapR defines the texture wrap mode of the r coordinates
     */
    public updateTextureWrappingMode(texture: InternalTexture, wrapU: Nullable<number>, wrapV: Nullable<number> = null, wrapR: Nullable<number> = null): void {
        const target = this._getTextureTarget(texture);

        if (wrapU !== null) {
            this._setTextureParameterInteger(target, this._gl.TEXTURE_WRAP_S, this._getTextureWrapMode(wrapU), texture);
            texture._cachedWrapU = wrapU;
        }
        if (wrapV !== null) {
            this._setTextureParameterInteger(target, this._gl.TEXTURE_WRAP_T, this._getTextureWrapMode(wrapV), texture);
            texture._cachedWrapV = wrapV;
        }
        if ((texture.is2DArray || texture.is3D) && wrapR !== null) {
            this._setTextureParameterInteger(target, this._gl.TEXTURE_WRAP_R, this._getTextureWrapMode(wrapR), texture);
            texture._cachedWrapR = wrapR;
        }

        this._bindTextureDirectly(target, null);
    }

    /**
     * @internal
     */
    public _uploadCompressedDataToTextureDirectly(
        texture: InternalTexture,
        internalFormat: number,
        width: number,
        height: number,
        data: ArrayBufferView,
        faceIndex: number = 0,
        lod: number = 0
    ) {
        const gl = this._gl;

        let target: GLenum = gl.TEXTURE_2D;
        if (texture.isCube) {
            target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceIndex;
        }

        if (texture._useSRGBBuffer) {
            switch (internalFormat) {
                case Constants.TEXTUREFORMAT_COMPRESSED_RGB8_ETC2:
                case Constants.TEXTUREFORMAT_COMPRESSED_RGB_ETC1_WEBGL:
                    // Note, if using ETC1 and sRGB is requested, this will use ETC2 if available.
                    if (this._caps.etc2) {
                        internalFormat = gl.COMPRESSED_SRGB8_ETC2;
                    } else {
                        texture._useSRGBBuffer = false;
                    }
                    break;
                case Constants.TEXTUREFORMAT_COMPRESSED_RGBA8_ETC2_EAC:
                    if (this._caps.etc2) {
                        internalFormat = gl.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC;
                    } else {
                        texture._useSRGBBuffer = false;
                    }
                    break;
                case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_BPTC_UNORM:
                    internalFormat = gl.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT;
                    break;
                case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_ASTC_4x4:
                    internalFormat = gl.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR;
                    break;
                case Constants.TEXTUREFORMAT_COMPRESSED_RGB_S3TC_DXT1:
                    if (this._caps.s3tc_srgb) {
                        internalFormat = gl.COMPRESSED_SRGB_S3TC_DXT1_EXT;
                    } else {
                        // S3TC sRGB extension not supported
                        texture._useSRGBBuffer = false;
                    }
                    break;
                case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT1:
                    if (this._caps.s3tc_srgb) {
                        internalFormat = gl.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
                    } else {
                        // S3TC sRGB extension not supported
                        texture._useSRGBBuffer = false;
                    }
                    break;
                case Constants.TEXTUREFORMAT_COMPRESSED_RGBA_S3TC_DXT5:
                    if (this._caps.s3tc_srgb) {
                        internalFormat = gl.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
                    } else {
                        // S3TC sRGB extension not supported
                        texture._useSRGBBuffer = false;
                    }
                    break;
                default:
                    // We don't support a sRGB format corresponding to internalFormat, so revert to non sRGB format
                    texture._useSRGBBuffer = false;
                    break;
            }
        }

        this._gl.compressedTexImage2D(target, lod, internalFormat, width, height, 0, <DataView>data);
    }

    /**
     * @internal
     */
    public _uploadDataToTextureDirectly(
        texture: InternalTexture,
        imageData: ArrayBufferView,
        faceIndex: number = 0,
        lod: number = 0,
        babylonInternalFormat?: number,
        useTextureWidthAndHeight = false
    ): void {
        const gl = this._gl;

        const textureType = this._getWebGLTextureType(texture.type);
        const format = this._getInternalFormat(texture.format);
        const internalFormat =
            babylonInternalFormat === undefined
                ? this._getRGBABufferInternalSizedFormat(texture.type, texture.format, texture._useSRGBBuffer)
                : this._getInternalFormat(babylonInternalFormat, texture._useSRGBBuffer);

        this._unpackFlipY(texture.invertY);

        let target: GLenum = gl.TEXTURE_2D;
        if (texture.isCube) {
            target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceIndex;
        }

        const lodMaxWidth = Math.round(Math.log(texture.width) * Math.LOG2E);
        const lodMaxHeight = Math.round(Math.log(texture.height) * Math.LOG2E);
        const width = useTextureWidthAndHeight ? texture.width : Math.pow(2, Math.max(lodMaxWidth - lod, 0));
        const height = useTextureWidthAndHeight ? texture.height : Math.pow(2, Math.max(lodMaxHeight - lod, 0));

        gl.texImage2D(target, lod, internalFormat, width, height, 0, format, textureType, imageData);
    }

    /**
     * Update a portion of an internal texture
     * @param texture defines the texture to update
     * @param imageData defines the data to store into the texture
     * @param xOffset defines the x coordinates of the update rectangle
     * @param yOffset defines the y coordinates of the update rectangle
     * @param width defines the width of the update rectangle
     * @param height defines the height of the update rectangle
     * @param faceIndex defines the face index if texture is a cube (0 by default)
     * @param lod defines the lod level to update (0 by default)
     * @param generateMipMaps defines whether to generate mipmaps or not
     */
    public updateTextureData(
        texture: InternalTexture,
        imageData: ArrayBufferView,
        xOffset: number,
        yOffset: number,
        width: number,
        height: number,
        faceIndex: number = 0,
        lod: number = 0,
        generateMipMaps = false
    ): void {
        const gl = this._gl;

        const textureType = this._getWebGLTextureType(texture.type);
        const format = this._getInternalFormat(texture.format);

        this._unpackFlipY(texture.invertY);

        let targetForBinding: GLenum = gl.TEXTURE_2D;
        let target: GLenum = gl.TEXTURE_2D;
        if (texture.isCube) {
            target = gl.TEXTURE_CUBE_MAP_POSITIVE_X + faceIndex;
            targetForBinding = gl.TEXTURE_CUBE_MAP;
        }

        this._bindTextureDirectly(targetForBinding, texture, true);

        gl.texSubImage2D(target, lod, xOffset, yOffset, width, height, format, textureType, imageData);

        if (generateMipMaps) {
            this._gl.generateMipmap(target);
        }

        this._bindTextureDirectly(targetForBinding, null);
    }

    /**
     * @internal
     */
    public _uploadArrayBufferViewToTexture(texture: InternalTexture, imageData: ArrayBufferView, faceIndex: number = 0, lod: number = 0): void {
        const gl = this._gl;
        const bindTarget = texture.isCube ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D;

        this._bindTextureDirectly(bindTarget, texture, true);

        this._uploadDataToTextureDirectly(texture, imageData, faceIndex, lod);

        this._bindTextureDirectly(bindTarget, null, true);
    }

    protected _prepareWebGLTextureContinuation(texture: InternalTexture, scene: Nullable<ISceneLike>, noMipmap: boolean, isCompressed: boolean, samplingMode: number): void {
        const gl = this._gl;
        if (!gl) {
            return;
        }

        const filters = this._getSamplingParameters(samplingMode, !noMipmap);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filters.mag);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filters.min);

        if (!noMipmap && !isCompressed) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }

        this._bindTextureDirectly(gl.TEXTURE_2D, null);

        // this.resetTextureCache();
        if (scene) {
            scene.removePendingData(texture);
        }

        texture.onLoadedObservable.notifyObservers(texture);
        texture.onLoadedObservable.clear();
    }

    private _prepareWebGLTexture(
        texture: InternalTexture,
        extension: string,
        scene: Nullable<ISceneLike>,
        img: HTMLImageElement | ImageBitmap | { width: number; height: number },
        invertY: boolean,
        noMipmap: boolean,
        isCompressed: boolean,
        processFunction: PrepareTextureProcessFunction,
        samplingMode: number,
        format: Nullable<number>
    ): void {
        const maxTextureSize = this.getCaps().maxTextureSize;
        const potWidth = Math.min(maxTextureSize, this.needPOTTextures ? GetExponentOfTwo(img.width, maxTextureSize) : img.width);
        const potHeight = Math.min(maxTextureSize, this.needPOTTextures ? GetExponentOfTwo(img.height, maxTextureSize) : img.height);

        const gl = this._gl;
        if (!gl) {
            return;
        }

        if (!texture._hardwareTexture) {
            //  this.resetTextureCache();
            if (scene) {
                scene.removePendingData(texture);
            }

            return;
        }

        this._bindTextureDirectly(gl.TEXTURE_2D, texture, true);
        this._unpackFlipY(invertY === undefined ? true : invertY ? true : false);

        texture.baseWidth = img.width;
        texture.baseHeight = img.height;
        texture.width = potWidth;
        texture.height = potHeight;
        texture.isReady = true;
        texture.type = texture.type !== -1 ? texture.type : Constants.TEXTURETYPE_UNSIGNED_BYTE;
        texture.format =
            texture.format !== -1 ? texture.format : (format ?? (extension === ".jpg" && !texture._useSRGBBuffer ? Constants.TEXTUREFORMAT_RGB : Constants.TEXTUREFORMAT_RGBA));

        if (
            processFunction(potWidth, potHeight, img, extension, texture, () => {
                this._prepareWebGLTextureContinuation(texture, scene, noMipmap, isCompressed, samplingMode);
            })
        ) {
            // Returning as texture needs extra async steps
            return;
        }

        this._prepareWebGLTextureContinuation(texture, scene, noMipmap, isCompressed, samplingMode);
    }

    public _getInternalFormatFromDepthTextureFormat(textureFormat: number, hasDepth: boolean, hasStencil: boolean): number {
        const gl = this._gl;

        if (!hasDepth) {
            return gl.STENCIL_INDEX8;
        }

        const format: GLenum = hasStencil ? gl.DEPTH_STENCIL : gl.DEPTH_COMPONENT;
        let internalFormat = format;
        if (this.webGLVersion > 1) {
            if (textureFormat === Constants.TEXTUREFORMAT_DEPTH16) {
                internalFormat = gl.DEPTH_COMPONENT16;
            } else if (textureFormat === Constants.TEXTUREFORMAT_DEPTH24) {
                internalFormat = gl.DEPTH_COMPONENT24;
            } else if (textureFormat === Constants.TEXTUREFORMAT_DEPTH24UNORM_STENCIL8 || textureFormat === Constants.TEXTUREFORMAT_DEPTH24_STENCIL8) {
                internalFormat = hasStencil ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24;
            } else if (textureFormat === Constants.TEXTUREFORMAT_DEPTH32_FLOAT) {
                internalFormat = gl.DEPTH_COMPONENT32F;
            } else if (textureFormat === Constants.TEXTUREFORMAT_DEPTH32FLOAT_STENCIL8) {
                internalFormat = hasStencil ? gl.DEPTH32F_STENCIL8 : gl.DEPTH_COMPONENT32F;
            }
        } else {
            internalFormat = gl.DEPTH_COMPONENT16;
        }

        return internalFormat;
    }

    public _getWebGLTextureTypeFromDepthTextureFormat(textureFormat: number): GLenum {
        const gl = this._gl;

        let type: GLenum = gl.UNSIGNED_INT;
        if (textureFormat === Constants.TEXTUREFORMAT_DEPTH16) {
            type = gl.UNSIGNED_SHORT;
        } else if (textureFormat === Constants.TEXTUREFORMAT_DEPTH24UNORM_STENCIL8 || textureFormat === Constants.TEXTUREFORMAT_DEPTH24_STENCIL8) {
            type = gl.UNSIGNED_INT_24_8;
        } else if (textureFormat === Constants.TEXTUREFORMAT_DEPTH32_FLOAT) {
            type = gl.FLOAT;
        } else if (textureFormat === Constants.TEXTUREFORMAT_DEPTH32FLOAT_STENCIL8) {
            type = gl.FLOAT_32_UNSIGNED_INT_24_8_REV;
        } else if (textureFormat === Constants.TEXTUREFORMAT_STENCIL8) {
            type = gl.UNSIGNED_BYTE;
        }

        return type;
    }

    /**
     * @internal
     */
    public _setupFramebufferDepthAttachments(
        generateStencilBuffer: boolean,
        generateDepthBuffer: boolean,
        width: number,
        height: number,
        samples = 1,
        depthTextureFormat?: number,
        dontBindRenderBufferToFrameBuffer = false
    ): Nullable<WebGLRenderbuffer> {
        const gl = this._gl;

        depthTextureFormat = depthTextureFormat ?? (generateStencilBuffer ? Constants.TEXTUREFORMAT_DEPTH24_STENCIL8 : Constants.TEXTUREFORMAT_DEPTH32_FLOAT);

        const internalFormat = this._getInternalFormatFromDepthTextureFormat(depthTextureFormat, generateDepthBuffer, generateStencilBuffer);

        // Create the depth/stencil buffer
        if (generateStencilBuffer && generateDepthBuffer) {
            return this._createRenderBuffer(width, height, samples, gl.DEPTH_STENCIL, internalFormat, dontBindRenderBufferToFrameBuffer ? -1 : gl.DEPTH_STENCIL_ATTACHMENT);
        }
        if (generateDepthBuffer) {
            return this._createRenderBuffer(width, height, samples, internalFormat, internalFormat, dontBindRenderBufferToFrameBuffer ? -1 : gl.DEPTH_ATTACHMENT);
        }
        if (generateStencilBuffer) {
            return this._createRenderBuffer(width, height, samples, internalFormat, internalFormat, dontBindRenderBufferToFrameBuffer ? -1 : gl.STENCIL_ATTACHMENT);
        }

        return null;
    }

    /**
     * @internal
     */
    public _createRenderBuffer(
        width: number,
        height: number,
        samples: number,
        internalFormat: number,
        msInternalFormat: number,
        attachment: number,
        unbindBuffer = true
    ): Nullable<WebGLRenderbuffer> {
        const gl = this._gl;
        const renderBuffer = gl.createRenderbuffer();
        return this._updateRenderBuffer(renderBuffer, width, height, samples, internalFormat, msInternalFormat, attachment, unbindBuffer);
    }

    public _updateRenderBuffer(
        renderBuffer: Nullable<WebGLRenderbuffer>,
        width: number,
        height: number,
        samples: number,
        internalFormat: number,
        msInternalFormat: number,
        attachment: number,
        unbindBuffer = true
    ): Nullable<WebGLRenderbuffer> {
        const gl = this._gl;

        gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);

        if (samples > 1 && gl.renderbufferStorageMultisample) {
            gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, msInternalFormat, width, height);
        } else {
            gl.renderbufferStorage(gl.RENDERBUFFER, internalFormat, width, height);
        }

        if (attachment !== -1) {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, renderBuffer);
        }

        if (unbindBuffer) {
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }

        return renderBuffer;
    }

    /**
     * @internal
     */
    public _releaseTexture(texture: InternalTexture): void {
        this._deleteTexture(texture._hardwareTexture as Nullable<WebGLHardwareTexture>);

        // Unbind channels
        this.unbindAllTextures();

        const index = this._internalTexturesCache.indexOf(texture);
        if (index !== -1) {
            this._internalTexturesCache.splice(index, 1);
        }

        // Integrated fixed lod samplers.
        if (texture._lodTextureHigh) {
            texture._lodTextureHigh.dispose();
        }
        if (texture._lodTextureMid) {
            texture._lodTextureMid.dispose();
        }
        if (texture._lodTextureLow) {
            texture._lodTextureLow.dispose();
        }

        // Integrated irradiance map.
        if (texture._irradianceTexture) {
            texture._irradianceTexture.dispose();
        }
    }

    protected _deleteTexture(texture: Nullable<WebGLHardwareTexture>): void {
        texture?.release();
    }

    protected _setProgram(program: Nullable<WebGLProgram>): void {
        if (this._currentProgram !== program) {
            _setProgram(program, this._gl);
            this._currentProgram = program;
        }
    }

    /**
     * @internal
     */
    public _boundUniforms: { [key: number]: WebGLUniformLocation } = {};

    /**
     * Binds an effect to the webGL context
     * @param effect defines the effect to bind
     */
    public bindSamplers(effect: Effect): void {
        const webGLPipelineContext = effect.getPipelineContext() as WebGLPipelineContext;
        this._setProgram(webGLPipelineContext.program);
        const samplers = effect.getSamplers();
        for (let index = 0; index < samplers.length; index++) {
            const uniform = effect.getUniform(samplers[index]);

            if (uniform) {
                this._boundUniforms[index] = uniform;
            }
        }
        this._currentEffect = null;
    }

    private _activateCurrentTexture() {
        if (this._currentTextureChannel !== this._activeChannel) {
            this._gl.activeTexture(this._gl.TEXTURE0 + this._activeChannel);
            this._currentTextureChannel = this._activeChannel;
        }
    }

    /**
     * @internal
     */
    public _bindTextureDirectly(target: number, texture: Nullable<InternalTexture>, forTextureDataUpdate = false, force = false): boolean {
        let wasPreviouslyBound = false;
        const isTextureForRendering = texture && texture._associatedChannel > -1;
        if (forTextureDataUpdate && isTextureForRendering) {
            this._activeChannel = texture._associatedChannel;
        }

        const currentTextureBound = this._boundTexturesCache[this._activeChannel];

        if (currentTextureBound !== texture || force) {
            this._activateCurrentTexture();

            if (texture && texture.isMultiview) {
                //this._gl.bindTexture(target, texture ? texture._colorTextureArray : null);
                Logger.Error(["_bindTextureDirectly called with a multiview texture!", target, texture]);
                // eslint-disable-next-line no-throw-literal
                throw "_bindTextureDirectly called with a multiview texture!";
            } else {
                this._gl.bindTexture(target, texture?._hardwareTexture?.underlyingResource ?? null);
            }

            this._boundTexturesCache[this._activeChannel] = texture;

            if (texture) {
                texture._associatedChannel = this._activeChannel;
            }
        } else if (forTextureDataUpdate) {
            wasPreviouslyBound = true;
            this._activateCurrentTexture();
        }

        if (isTextureForRendering && !forTextureDataUpdate) {
            this._bindSamplerUniformToChannel(texture._associatedChannel, this._activeChannel);
        }

        return wasPreviouslyBound;
    }

    /**
     * @internal
     */
    public _bindTexture(channel: number, texture: Nullable<InternalTexture>, name: string): void {
        if (channel === undefined) {
            return;
        }

        if (texture) {
            texture._associatedChannel = channel;
        }

        this._activeChannel = channel;
        const target = texture ? this._getTextureTarget(texture) : this._gl.TEXTURE_2D;
        this._bindTextureDirectly(target, texture);
    }

    /**
     * Unbind all textures from the webGL context
     */
    public unbindAllTextures(): void {
        for (let channel = 0; channel < this._maxSimultaneousTextures; channel++) {
            this._activeChannel = channel;
            this._bindTextureDirectly(this._gl.TEXTURE_2D, null);
            this._bindTextureDirectly(this._gl.TEXTURE_CUBE_MAP, null);
            if (this.webGLVersion > 1) {
                this._bindTextureDirectly(this._gl.TEXTURE_3D, null);
                this._bindTextureDirectly(this._gl.TEXTURE_2D_ARRAY, null);
            }
        }
    }

    /**
     * Sets a texture to the according uniform.
     * @param channel The texture channel
     * @param uniform The uniform to set
     * @param texture The texture to apply
     * @param name The name of the uniform in the effect
     */
    public setTexture(channel: number, uniform: Nullable<WebGLUniformLocation>, texture: Nullable<ThinTexture>, name: string): void {
        if (channel === undefined) {
            return;
        }

        if (uniform) {
            this._boundUniforms[channel] = uniform;
        }

        this._setTexture(channel, texture);
    }

    private _bindSamplerUniformToChannel(sourceSlot: number, destination: number) {
        const uniform = this._boundUniforms[sourceSlot];
        if (!uniform || uniform._currentState === destination) {
            return;
        }
        this._gl.uniform1i(uniform, destination);
        uniform._currentState = destination;
    }

    private _getTextureWrapMode(mode: number): number {
        switch (mode) {
            case Constants.TEXTURE_WRAP_ADDRESSMODE:
                return this._gl.REPEAT;
            case Constants.TEXTURE_CLAMP_ADDRESSMODE:
                return this._gl.CLAMP_TO_EDGE;
            case Constants.TEXTURE_MIRROR_ADDRESSMODE:
                return this._gl.MIRRORED_REPEAT;
        }
        return this._gl.REPEAT;
    }

    public override _setTexture(channel: number, texture: Nullable<ThinTexture>, isPartOfTextureArray = false, depthStencilTexture = false, name = ""): boolean {
        // Not ready?
        if (!texture) {
            if (this._boundTexturesCache[channel] != null) {
                this._activeChannel = channel;
                this._bindTextureDirectly(this._gl.TEXTURE_2D, null);
                this._bindTextureDirectly(this._gl.TEXTURE_CUBE_MAP, null);
                if (this.webGLVersion > 1) {
                    this._bindTextureDirectly(this._gl.TEXTURE_3D, null);
                    this._bindTextureDirectly(this._gl.TEXTURE_2D_ARRAY, null);
                }
            }
            return false;
        }

        // Video
        if ((<VideoTexture>texture).video) {
            this._activeChannel = channel;
            const videoInternalTexture = (<VideoTexture>texture).getInternalTexture();
            if (videoInternalTexture) {
                videoInternalTexture._associatedChannel = channel;
            }
            (<VideoTexture>texture).update();
        } else if (texture.delayLoadState === Constants.DELAYLOADSTATE_NOTLOADED) {
            // Delay loading
            texture.delayLoad();
            return false;
        }

        let internalTexture: InternalTexture;
        if (depthStencilTexture) {
            internalTexture = (<RenderTargetTexture>texture).depthStencilTexture!;
        } else if (texture.isReady()) {
            internalTexture = <InternalTexture>texture.getInternalTexture();
        } else if (texture.isCube) {
            internalTexture = this.emptyCubeTexture;
        } else if (texture.is3D) {
            internalTexture = this.emptyTexture3D;
        } else if (texture.is2DArray) {
            internalTexture = this.emptyTexture2DArray;
        } else {
            internalTexture = this.emptyTexture;
        }

        if (!isPartOfTextureArray && internalTexture) {
            internalTexture._associatedChannel = channel;
        }

        let needToBind = true;
        if (this._boundTexturesCache[channel] === internalTexture) {
            if (!isPartOfTextureArray) {
                this._bindSamplerUniformToChannel(internalTexture._associatedChannel, channel);
            }

            needToBind = false;
        }

        this._activeChannel = channel;
        const target = this._getTextureTarget(internalTexture);
        if (needToBind) {
            this._bindTextureDirectly(target, internalTexture, isPartOfTextureArray);
        }

        if (internalTexture && !internalTexture.isMultiview) {
            // CUBIC_MODE and SKYBOX_MODE both require CLAMP_TO_EDGE.  All other modes use REPEAT.
            if (internalTexture.isCube && internalTexture._cachedCoordinatesMode !== texture.coordinatesMode) {
                internalTexture._cachedCoordinatesMode = texture.coordinatesMode;

                const textureWrapMode =
                    texture.coordinatesMode !== Constants.TEXTURE_CUBIC_MODE && texture.coordinatesMode !== Constants.TEXTURE_SKYBOX_MODE
                        ? Constants.TEXTURE_WRAP_ADDRESSMODE
                        : Constants.TEXTURE_CLAMP_ADDRESSMODE;
                texture.wrapU = textureWrapMode;
                texture.wrapV = textureWrapMode;
            }

            if (internalTexture._cachedWrapU !== texture.wrapU) {
                internalTexture._cachedWrapU = texture.wrapU;
                this._setTextureParameterInteger(target, this._gl.TEXTURE_WRAP_S, this._getTextureWrapMode(texture.wrapU), internalTexture);
            }

            if (internalTexture._cachedWrapV !== texture.wrapV) {
                internalTexture._cachedWrapV = texture.wrapV;
                this._setTextureParameterInteger(target, this._gl.TEXTURE_WRAP_T, this._getTextureWrapMode(texture.wrapV), internalTexture);
            }

            if (internalTexture.is3D && internalTexture._cachedWrapR !== texture.wrapR) {
                internalTexture._cachedWrapR = texture.wrapR;
                this._setTextureParameterInteger(target, this._gl.TEXTURE_WRAP_R, this._getTextureWrapMode(texture.wrapR), internalTexture);
            }

            this._setAnisotropicLevel(target, internalTexture, texture.anisotropicFilteringLevel);
        }

        return true;
    }

    /**
     * Sets an array of texture to the webGL context
     * @param channel defines the channel where the texture array must be set
     * @param uniform defines the associated uniform location
     * @param textures defines the array of textures to bind
     * @param name name of the channel
     */
    public setTextureArray(channel: number, uniform: Nullable<WebGLUniformLocation>, textures: ThinTexture[], name: string): void {
        if (channel === undefined || !uniform) {
            return;
        }

        if (!this._textureUnits || this._textureUnits.length !== textures.length) {
            this._textureUnits = new Int32Array(textures.length);
        }
        for (let i = 0; i < textures.length; i++) {
            const texture = textures[i].getInternalTexture();

            if (texture) {
                this._textureUnits[i] = channel + i;
                texture._associatedChannel = channel + i;
            } else {
                this._textureUnits[i] = -1;
            }
        }
        this._gl.uniform1iv(uniform, this._textureUnits);

        for (let index = 0; index < textures.length; index++) {
            this._setTexture(this._textureUnits[index], textures[index], true);
        }
    }

    /**
     * @internal
     */
    public _setAnisotropicLevel(target: number, internalTexture: InternalTexture, anisotropicFilteringLevel: number) {
        const anisotropicFilterExtension = this._caps.textureAnisotropicFilterExtension;
        if (
            internalTexture.samplingMode !== Constants.TEXTURE_LINEAR_LINEAR_MIPNEAREST &&
            internalTexture.samplingMode !== Constants.TEXTURE_LINEAR_LINEAR_MIPLINEAR &&
            internalTexture.samplingMode !== Constants.TEXTURE_LINEAR_LINEAR
        ) {
            anisotropicFilteringLevel = 1; // Forcing the anisotropic to 1 because else webgl will force filters to linear
        }

        if (anisotropicFilterExtension && internalTexture._cachedAnisotropicFilteringLevel !== anisotropicFilteringLevel) {
            this._setTextureParameterFloat(
                target,
                anisotropicFilterExtension.TEXTURE_MAX_ANISOTROPY_EXT,
                Math.min(anisotropicFilteringLevel, this._caps.maxAnisotropy),
                internalTexture
            );
            internalTexture._cachedAnisotropicFilteringLevel = anisotropicFilteringLevel;
        }
    }

    private _setTextureParameterFloat(target: number, parameter: number, value: number, texture: InternalTexture): void {
        this._bindTextureDirectly(target, texture, true, true);
        this._gl.texParameterf(target, parameter, value);
    }

    private _setTextureParameterInteger(target: number, parameter: number, value: number, texture?: InternalTexture) {
        if (texture) {
            this._bindTextureDirectly(target, texture, true, true);
        }
        this._gl.texParameteri(target, parameter, value);
    }

    /**
     * Unbind all vertex attributes from the webGL context
     */
    public unbindAllAttributes() {
        if (this._mustWipeVertexAttributes) {
            this._mustWipeVertexAttributes = false;

            for (let i = 0; i < this._caps.maxVertexAttribs; i++) {
                this.disableAttributeByIndex(i);
            }
            return;
        }

        for (let i = 0, ul = this._vertexAttribArraysEnabled.length; i < ul; i++) {
            if (i >= this._caps.maxVertexAttribs || !this._vertexAttribArraysEnabled[i]) {
                continue;
            }

            this.disableAttributeByIndex(i);
        }
    }

    /**
     * Force the engine to release all cached effects. This means that next effect compilation will have to be done completely even if a similar effect was already compiled
     */
    public releaseEffects() {
        this._compiledEffects = {};
        this.onReleaseEffectsObservable.notifyObservers(this);
    }

    /**
     * Dispose and release all associated resources
     */
    public override dispose(): void {
        // Events
        if (IsWindowObjectExist()) {
            if (this._renderingCanvas) {
                this._renderingCanvas.removeEventListener("webglcontextlost", this._onContextLost);

                if (this._onContextRestored) {
                    this._renderingCanvas.removeEventListener("webglcontextrestored", this._onContextRestored);
                }
            }
        }

        // Should not be moved up of renderingCanvas will be null.
        super.dispose();

        if (this._dummyFramebuffer) {
            this._gl.deleteFramebuffer(this._dummyFramebuffer);
        }

        // Unbind
        this.unbindAllAttributes();
        this._boundUniforms = {};

        this._workingCanvas = null;
        this._workingContext = null;
        this._currentBufferPointers.length = 0;
        this._currentProgram = null;

        if ((this._creationOptions as EngineOptions).loseContextOnDispose) {
            this._gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
        // clear the state object
        deleteStateObject(this._gl);
    }

    /**
     * Attach a new callback raised when context lost event is fired
     * @param callback defines the callback to call
     */
    public attachContextLostEvent(callback: (event: WebGLContextEvent) => void): void {
        if (this._renderingCanvas) {
            this._renderingCanvas.addEventListener("webglcontextlost", <any>callback, false);
        }
    }

    /**
     * Attach a new callback raised when context restored event is fired
     * @param callback defines the callback to call
     */
    public attachContextRestoredEvent(callback: (event: WebGLContextEvent) => void): void {
        if (this._renderingCanvas) {
            this._renderingCanvas.addEventListener("webglcontextrestored", <any>callback, false);
        }
    }

    /**
     * Get the current error code of the webGL context
     * @returns the error code
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getError
     */
    public getError(): number {
        return this._gl.getError();
    }

    private _canRenderToFloatFramebuffer(): boolean {
        if (this._webGLVersion > 1) {
            return this._caps.colorBufferFloat;
        }
        return this._canRenderToFramebuffer(Constants.TEXTURETYPE_FLOAT);
    }

    private _canRenderToHalfFloatFramebuffer(): boolean {
        if (this._webGLVersion > 1) {
            return this._caps.colorBufferFloat;
        }
        return this._canRenderToFramebuffer(Constants.TEXTURETYPE_HALF_FLOAT);
    }

    // Thank you : http://stackoverflow.com/questions/28827511/webgl-ios-render-to-floating-point-texture
    private _canRenderToFramebuffer(type: number): boolean {
        const gl = this._gl;

        //clear existing errors
        // eslint-disable-next-line no-empty
        while (gl.getError() !== gl.NO_ERROR) {}

        let successful = true;

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, this._getRGBABufferInternalSizedFormat(type), 1, 1, 0, gl.RGBA, this._getWebGLTextureType(type), null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

        successful = successful && status === gl.FRAMEBUFFER_COMPLETE;
        successful = successful && gl.getError() === gl.NO_ERROR;

        //try render by clearing frame buffer's color buffer
        if (successful) {
            gl.clear(gl.COLOR_BUFFER_BIT);
            successful = successful && gl.getError() === gl.NO_ERROR;
        }

        //try reading from frame to ensure render occurs (just creating the FBO is not sufficient to determine if rendering is supported)
        if (successful) {
            //in practice it's sufficient to just read from the backbuffer rather than handle potentially issues reading from the texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            const readFormat = gl.RGBA;
            const readType = gl.UNSIGNED_BYTE;
            const buffer = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, readFormat, readType, buffer);
            successful = successful && gl.getError() === gl.NO_ERROR;
        }

        //clean up
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(fb);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //clear accumulated errors
        // eslint-disable-next-line no-empty
        while (!successful && gl.getError() !== gl.NO_ERROR) {}

        return successful;
    }

    /**
     * @internal
     */
    public _getWebGLTextureType(type: number): number {
        if (this._webGLVersion === 1) {
            switch (type) {
                case Constants.TEXTURETYPE_FLOAT:
                    return this._gl.FLOAT;
                case Constants.TEXTURETYPE_HALF_FLOAT:
                    return this._gl.HALF_FLOAT_OES;
                case Constants.TEXTURETYPE_UNSIGNED_BYTE:
                    return this._gl.UNSIGNED_BYTE;
                case Constants.TEXTURETYPE_UNSIGNED_SHORT_4_4_4_4:
                    return this._gl.UNSIGNED_SHORT_4_4_4_4;
                case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_5_5_1:
                    return this._gl.UNSIGNED_SHORT_5_5_5_1;
                case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_6_5:
                    return this._gl.UNSIGNED_SHORT_5_6_5;
            }
            return this._gl.UNSIGNED_BYTE;
        }

        switch (type) {
            case Constants.TEXTURETYPE_BYTE:
                return this._gl.BYTE;
            case Constants.TEXTURETYPE_UNSIGNED_BYTE:
                return this._gl.UNSIGNED_BYTE;
            case Constants.TEXTURETYPE_SHORT:
                return this._gl.SHORT;
            case Constants.TEXTURETYPE_UNSIGNED_SHORT:
                return this._gl.UNSIGNED_SHORT;
            case Constants.TEXTURETYPE_INT:
                return this._gl.INT;
            case Constants.TEXTURETYPE_UNSIGNED_INTEGER: // Refers to UNSIGNED_INT
                return this._gl.UNSIGNED_INT;
            case Constants.TEXTURETYPE_FLOAT:
                return this._gl.FLOAT;
            case Constants.TEXTURETYPE_HALF_FLOAT:
                return this._gl.HALF_FLOAT;
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_4_4_4_4:
                return this._gl.UNSIGNED_SHORT_4_4_4_4;
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_5_5_1:
                return this._gl.UNSIGNED_SHORT_5_5_5_1;
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_6_5:
                return this._gl.UNSIGNED_SHORT_5_6_5;
            case Constants.TEXTURETYPE_UNSIGNED_INT_2_10_10_10_REV:
                return this._gl.UNSIGNED_INT_2_10_10_10_REV;
            case Constants.TEXTURETYPE_UNSIGNED_INT_24_8:
                return this._gl.UNSIGNED_INT_24_8;
            case Constants.TEXTURETYPE_UNSIGNED_INT_10F_11F_11F_REV:
                return this._gl.UNSIGNED_INT_10F_11F_11F_REV;
            case Constants.TEXTURETYPE_UNSIGNED_INT_5_9_9_9_REV:
                return this._gl.UNSIGNED_INT_5_9_9_9_REV;
            case Constants.TEXTURETYPE_FLOAT_32_UNSIGNED_INT_24_8_REV:
                return this._gl.FLOAT_32_UNSIGNED_INT_24_8_REV;
        }

        return this._gl.UNSIGNED_BYTE;
    }

    /**
     * @internal
     */
    public _getInternalFormat(format: number, useSRGBBuffer = false): number {
        let internalFormat: GLenum = useSRGBBuffer ? this._glSRGBExtensionValues.SRGB8_ALPHA8 : this._gl.RGBA;

        switch (format) {
            case Constants.TEXTUREFORMAT_ALPHA:
                internalFormat = this._gl.ALPHA;
                break;
            case Constants.TEXTUREFORMAT_LUMINANCE:
                internalFormat = this._gl.LUMINANCE;
                break;
            case Constants.TEXTUREFORMAT_LUMINANCE_ALPHA:
                internalFormat = this._gl.LUMINANCE_ALPHA;
                break;
            case Constants.TEXTUREFORMAT_RED:
            case Constants.TEXTUREFORMAT_R16_UNORM:
            case Constants.TEXTUREFORMAT_R16_SNORM:
                internalFormat = this._gl.RED;
                break;
            case Constants.TEXTUREFORMAT_RG:
            case Constants.TEXTUREFORMAT_RG16_UNORM:
            case Constants.TEXTUREFORMAT_RG16_SNORM:
                internalFormat = this._gl.RG;
                break;
            case Constants.TEXTUREFORMAT_RGB:
            case Constants.TEXTUREFORMAT_RGB16_UNORM:
            case Constants.TEXTUREFORMAT_RGB16_SNORM:
                internalFormat = useSRGBBuffer ? this._glSRGBExtensionValues.SRGB : this._gl.RGB;
                break;
            case Constants.TEXTUREFORMAT_RGBA:
            case Constants.TEXTUREFORMAT_RGBA16_UNORM:
            case Constants.TEXTUREFORMAT_RGBA16_SNORM:
                internalFormat = useSRGBBuffer ? this._glSRGBExtensionValues.SRGB8_ALPHA8 : this._gl.RGBA;
                break;
        }

        if (this._webGLVersion > 1) {
            switch (format) {
                case Constants.TEXTUREFORMAT_RED_INTEGER:
                    internalFormat = this._gl.RED_INTEGER;
                    break;
                case Constants.TEXTUREFORMAT_RG_INTEGER:
                    internalFormat = this._gl.RG_INTEGER;
                    break;
                case Constants.TEXTUREFORMAT_RGB_INTEGER:
                    internalFormat = this._gl.RGB_INTEGER;
                    break;
                case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                    internalFormat = this._gl.RGBA_INTEGER;
                    break;
            }
        }

        return internalFormat;
    }

    /**
     * @internal
     */
    public _getRGBABufferInternalSizedFormat(type: number, format?: number, useSRGBBuffer = false): number {
        if (this._webGLVersion === 1) {
            if (format !== undefined) {
                switch (format) {
                    case Constants.TEXTUREFORMAT_ALPHA:
                        return this._gl.ALPHA;
                    case Constants.TEXTUREFORMAT_LUMINANCE:
                        return this._gl.LUMINANCE;
                    case Constants.TEXTUREFORMAT_LUMINANCE_ALPHA:
                        return this._gl.LUMINANCE_ALPHA;
                    case Constants.TEXTUREFORMAT_RGB:
                        return useSRGBBuffer ? this._glSRGBExtensionValues.SRGB : this._gl.RGB;
                }
            }
            return this._gl.RGBA;
        }

        switch (type) {
            case Constants.TEXTURETYPE_BYTE:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return this._gl.R8_SNORM;
                    case Constants.TEXTUREFORMAT_RG:
                        return this._gl.RG8_SNORM;
                    case Constants.TEXTUREFORMAT_RGB:
                        return this._gl.RGB8_SNORM;
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return this._gl.R8I;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return this._gl.RG8I;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        return this._gl.RGB8I;
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return this._gl.RGBA8I;
                    default:
                        return this._gl.RGBA8_SNORM;
                }
            case Constants.TEXTURETYPE_UNSIGNED_BYTE:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return this._gl.R8;
                    case Constants.TEXTUREFORMAT_RG:
                        return this._gl.RG8;
                    case Constants.TEXTUREFORMAT_RGB:
                        return useSRGBBuffer ? this._glSRGBExtensionValues.SRGB8 : this._gl.RGB8; // By default. Other possibilities are RGB565, SRGB8.
                    case Constants.TEXTUREFORMAT_RGBA:
                        return useSRGBBuffer ? this._glSRGBExtensionValues.SRGB8_ALPHA8 : this._gl.RGBA8; // By default. Other possibilities are RGB5_A1, RGBA4, SRGB8_ALPHA8.
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return this._gl.R8UI;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return this._gl.RG8UI;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        return this._gl.RGB8UI;
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return this._gl.RGBA8UI;
                    case Constants.TEXTUREFORMAT_ALPHA:
                        return this._gl.ALPHA;
                    case Constants.TEXTUREFORMAT_LUMINANCE:
                        return this._gl.LUMINANCE;
                    case Constants.TEXTUREFORMAT_LUMINANCE_ALPHA:
                        return this._gl.LUMINANCE_ALPHA;
                    default:
                        return this._gl.RGBA8;
                }
            case Constants.TEXTURETYPE_SHORT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return this._gl.R16I;
                    case Constants.TEXTUREFORMAT_R16_SNORM:
                        return this._gl.R16_SNORM_EXT;
                    case Constants.TEXTUREFORMAT_RG16_SNORM:
                        return this._gl.RG16_SNORM_EXT;
                    case Constants.TEXTUREFORMAT_RGB16_SNORM:
                        return this._gl.RGB16_SNORM_EXT;
                    case Constants.TEXTUREFORMAT_RGBA16_SNORM:
                        return this._gl.RGBA16_SNORM_EXT;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return this._gl.RG16I;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        return this._gl.RGB16I;
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return this._gl.RGBA16I;
                    default:
                        return this._gl.RGBA16I;
                }
            case Constants.TEXTURETYPE_UNSIGNED_SHORT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return this._gl.R16UI;
                    case Constants.TEXTUREFORMAT_R16_UNORM:
                        return this._gl.R16_EXT;
                    case Constants.TEXTUREFORMAT_RG16_UNORM:
                        return this._gl.RG16_EXT;
                    case Constants.TEXTUREFORMAT_RGB16_UNORM:
                        return this._gl.RGB16_EXT;
                    case Constants.TEXTUREFORMAT_RGBA16_UNORM:
                        return this._gl.RGBA16_EXT;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return this._gl.RG16UI;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        return this._gl.RGB16UI;
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return this._gl.RGBA16UI;
                    default:
                        return this._gl.RGBA16UI;
                }
            case Constants.TEXTURETYPE_INT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return this._gl.R32I;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return this._gl.RG32I;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        return this._gl.RGB32I;
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return this._gl.RGBA32I;
                    default:
                        return this._gl.RGBA32I;
                }
            case Constants.TEXTURETYPE_UNSIGNED_INTEGER: // Refers to UNSIGNED_INT
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED_INTEGER:
                        return this._gl.R32UI;
                    case Constants.TEXTUREFORMAT_RG_INTEGER:
                        return this._gl.RG32UI;
                    case Constants.TEXTUREFORMAT_RGB_INTEGER:
                        return this._gl.RGB32UI;
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return this._gl.RGBA32UI;
                    default:
                        return this._gl.RGBA32UI;
                }
            case Constants.TEXTURETYPE_FLOAT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return this._gl.R32F; // By default. Other possibility is R16F.
                    case Constants.TEXTUREFORMAT_RG:
                        return this._gl.RG32F; // By default. Other possibility is RG16F.
                    case Constants.TEXTUREFORMAT_RGB:
                        return this._gl.RGB32F; // By default. Other possibilities are RGB16F, R11F_G11F_B10F, RGB9_E5.
                    case Constants.TEXTUREFORMAT_RGBA:
                        return this._gl.RGBA32F; // By default. Other possibility is RGBA16F.
                    default:
                        return this._gl.RGBA32F;
                }
            case Constants.TEXTURETYPE_HALF_FLOAT:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RED:
                        return this._gl.R16F;
                    case Constants.TEXTUREFORMAT_RG:
                        return this._gl.RG16F;
                    case Constants.TEXTUREFORMAT_RGB:
                        return this._gl.RGB16F; // By default. Other possibilities are R11F_G11F_B10F, RGB9_E5.
                    case Constants.TEXTUREFORMAT_RGBA:
                        return this._gl.RGBA16F;
                    default:
                        return this._gl.RGBA16F;
                }
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_6_5:
                return this._gl.RGB565;
            case Constants.TEXTURETYPE_UNSIGNED_INT_10F_11F_11F_REV:
                return this._gl.R11F_G11F_B10F;
            case Constants.TEXTURETYPE_UNSIGNED_INT_5_9_9_9_REV:
                return this._gl.RGB9_E5;
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_4_4_4_4:
                return this._gl.RGBA4;
            case Constants.TEXTURETYPE_UNSIGNED_SHORT_5_5_5_1:
                return this._gl.RGB5_A1;
            case Constants.TEXTURETYPE_UNSIGNED_INT_2_10_10_10_REV:
                switch (format) {
                    case Constants.TEXTUREFORMAT_RGBA:
                        return this._gl.RGB10_A2; // By default. Other possibility is RGB5_A1.
                    case Constants.TEXTUREFORMAT_RGBA_INTEGER:
                        return this._gl.RGB10_A2UI;
                    default:
                        return this._gl.RGB10_A2;
                }
        }

        return useSRGBBuffer ? this._glSRGBExtensionValues.SRGB8_ALPHA8 : this._gl.RGBA8;
    }

    /**
     * Reads pixels from the current frame buffer. Please note that this function can be slow
     * @param x defines the x coordinate of the rectangle where pixels must be read
     * @param y defines the y coordinate of the rectangle where pixels must be read
     * @param width defines the width of the rectangle where pixels must be read
     * @param height defines the height of the rectangle where pixels must be read
     * @param hasAlpha defines whether the output should have alpha or not (defaults to true)
     * @param flushRenderer true to flush the renderer from the pending commands before reading the pixels
     * @param data defines the data to fill with the read pixels (if not provided, a new one will be created)
     * @returns a ArrayBufferView promise (Uint8Array) containing RGBA colors
     */
    // Async function, not named Async and not marked as async to avoid breaking changes
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public readPixels(x: number, y: number, width: number, height: number, hasAlpha = true, flushRenderer = true, data: Nullable<Uint8Array> = null): Promise<ArrayBufferView> {
        const numChannels = hasAlpha ? 4 : 3;
        const format = hasAlpha ? this._gl.RGBA : this._gl.RGB;

        const dataLength = width * height * numChannels;
        if (!data) {
            data = new Uint8Array(dataLength);
        } else if (data.length < dataLength) {
            Logger.Error(`Data buffer is too small to store the read pixels (${data.length} should be more than ${dataLength})`);
            return Promise.resolve(data);
        }

        if (flushRenderer) {
            this.flushFramebuffer();
        }
        this._gl.readPixels(x, y, width, height, format, this._gl.UNSIGNED_BYTE, data);
        return Promise.resolve(data);
    }

    // Statics

    private static _IsSupported: Nullable<boolean> = null;
    private static _HasMajorPerformanceCaveat: Nullable<boolean> = null;

    /**
     * Gets a Promise<boolean> indicating if the engine can be instantiated (ie. if a webGL context can be found)
     */
    // eslint-disable-next-line no-restricted-syntax
    public static get IsSupportedAsync(): Promise<boolean> {
        return Promise.resolve(this.isSupported());
    }

    /**
     * Gets a boolean indicating if the engine can be instantiated (ie. if a webGL context can be found)
     */
    public static get IsSupported(): boolean {
        return this.isSupported(); // Backward compat
    }

    /**
     * Gets a boolean indicating if the engine can be instantiated (ie. if a webGL context can be found)
     * @returns true if the engine can be created
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public static isSupported(): boolean {
        if (this._HasMajorPerformanceCaveat !== null) {
            return !this._HasMajorPerformanceCaveat; // We know it is performant so WebGL is supported
        }

        if (this._IsSupported === null) {
            try {
                const tempcanvas = AbstractEngine._CreateCanvas(1, 1);
                const gl = tempcanvas.getContext("webgl") || (tempcanvas as any).getContext("experimental-webgl");

                this._IsSupported = gl != null && !!window.WebGLRenderingContext;
            } catch (e) {
                this._IsSupported = false;
            }
        }

        return this._IsSupported;
    }

    /**
     * Gets a boolean indicating if the engine can be instantiated on a performant device (ie. if a webGL context can be found and it does not use a slow implementation)
     */
    public static get HasMajorPerformanceCaveat(): boolean {
        if (this._HasMajorPerformanceCaveat === null) {
            try {
                const tempcanvas = AbstractEngine._CreateCanvas(1, 1);
                const gl =
                    tempcanvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }) ||
                    (tempcanvas as any).getContext("experimental-webgl", { failIfMajorPerformanceCaveat: true });

                this._HasMajorPerformanceCaveat = !gl;
            } catch (e) {
                this._HasMajorPerformanceCaveat = false;
            }
        }

        return this._HasMajorPerformanceCaveat;
    }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
interface TexImageParameters {
    internalFormat: number;
    format: number;
    type: number;
}
