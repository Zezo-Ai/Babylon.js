/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import type { GlobalState } from "../../globalState";
import { LineContainerComponent } from "shared-ui-components/lines/lineContainerComponent";
import { DraggableLineComponent } from "shared-ui-components/lines/draggableLineComponent";
import { NodeMaterialModes } from "core/Materials/Node/Enums/nodeMaterialModes";
import type { Observer } from "core/Misc/observable";
import type { Nullable } from "core/types";
import { DraggableLineWithButtonComponent } from "shared-ui-components/lines/draggableLineWithButtonComponent";
import { LineWithFileButtonComponent } from "shared-ui-components/lines/lineWithFileButtonComponent";
import { Tools } from "core/Misc/tools";
import addButton from "../../imgs/add.svg";
import deleteButton from "../../imgs/delete.svg";
import { NodeLedger } from "shared-ui-components/nodeGraphSystem/nodeLedger";

import "./nodeList.scss";
import { ToolContext } from "shared-ui-components/fluent/hoc/fluentToolWrapper";
import { Accordion } from "shared-ui-components/fluent/primitives/accordion";
import { SearchBar } from "shared-ui-components/fluent/primitives/searchBar";

interface INodeListComponentProps {
    globalState: GlobalState;
}

export class NodeListComponent extends React.Component<INodeListComponentProps, { filter: string }> {
    private _onResetRequiredObserver: Nullable<Observer<boolean>>;

    private static _Tooltips: { [key: string]: string } = {
        BonesBlock: "Provides a world matrix for each vertex, based on skeletal (bone/joint) animation",
        MorphTargetsBlock: "Provides the final positions, normals, tangents, and uvs based on morph targets in a mesh",
        AddBlock: "Adds the left and right inputs of the same type together",
        DistanceBlock: "Provides a distance vector based on the left and right input vectors",
        DivideBlock: "Divides the left input by the right input of the same type",
        LengthBlock: "Outputs the length of an input vector",
        MaxBlock: "Outputs the largest value between the left and right inputs of the same type",
        MinBlock: "Outputs the smallest value between the left and right inputs of the same type",
        MultiplyBlock: "Multiplies the left and right inputs of the same type together",
        NegateBlock: "Multiplies the input by -1",
        OneMinusBlock: "Subtracts each channel of the input value from 1 (1 - input)",
        RandomNumberBlock: "Provides a random number based on an input seed",
        ReciprocalBlock: "Quotient of 1 divided by the input",
        ScaleBlock: "Multiplies the input channels by a float factor",
        SubtractBlock: "Subtracts the right input from the left input of the same type",
        GradientBlock: "Returns the color in the gradient represented by the target value of the input",
        PosterizeBlock: "Reduces the number of values in each channel to the number in the corresponding channel of steps",
        ReplaceColorBlock: "Outputs the replacement color if the distance between value and reference is less than distance, else outputs the value color",
        ColorMergerBlock: "Combines float input channels into a color",
        ColorSplitterBlock: "Separates color input channels into individual floats",
        VectorMergerBlock: "Combines up to four input floats into a vector",
        VectorSplitterBlock: "Separates vectors input channels into individual floats",
        Color3: "A color made up of red, green, and blue channel values",
        Color4: "A color made up of red, green, blue, and alpha channel values",
        MaterialAlphaBlock: "A float representing the alpha value of the material",
        DeltaTimeBlock: "A float representing the time that has passed since the last frame was rendered",
        Float: "A floating point number representing a value with a fractional component",
        TextureBlock: "A node for reading a linked or embedded texture file",
        PrePassTextureBlock: "A node for reading textures from the prepass",
        MouseInfoBlock: "return a Vector4 that contains x, y, leftButton, rightButton",
        TimeBlock: "A float value that represents the time that has passed since the scene was loaded (it is incremented by 0.6 each second)",
        RealTimeBlock: "A float value that represents the number of seconds that have elapsed since the engine was initialized",
        Vector2: "a vector composed of X and Y channels",
        Vector3: "a vector composed of X, Y, and Z channels",
        Vector4: "a vector composed of X, Y, Z, and W channels",
        LerpBlock: "Outputs a value that is a mix of the left and right inputs based on the target value",
        NLerpBlock: "Outputs a value that is a mix of the left and right inputs based on the target's normalized value",
        SmoothStepBlock: "Outputs a value based on a the input value's position on a curve between the two edge values",
        StepBlock: "Outputs 1 for any input value above the edge input, outputs 0 for any input value below the edge input",
        Matrix: "A 4x4 table of related values",
        ProjectionMatrixBlock: "A matrix to remap points in 3D space to 2D plane relative to the screen",
        ViewMatrixBlock: "A matrix to remap points in 3D space to 2D plane relative to the view of the scene camera",
        ViewProjectionMatrixBlock: "A matrix to remap points in 3D space to 2D view space before remapping to 2D screen space",
        WorldMatrixBlock: "A matrix to remap points in 3D local space to 3D world space",
        WorldViewProjectionMatrixBlock: "A matrix to remap points in 3D local space to 3D world space, then to 2D camera space, and ending in 2D screen space",
        ColorBlock: "Outputs the RGBA color of each vertex in the mesh",
        InstanceColorBlock: "Outputs the RGBA color of each instance",
        InstancesBlock: "Provides the world matrix for each instance to apply this material to all instances",
        MatrixIndicesBlock: "A Vector4 representing the vertex to bone skinning assignments",
        MatrixWeightsBlock: "A Vector4 representing the vertex to bone skinning weights",
        MatrixIndicesExtraBlock: "A Vector4 representing the vertex to bone skinning assignments when the number of influences per bone is greater than 4",
        MatrixWeightsExtraBlock: "A Vector4 representing the vertex to bone skinning weights when the number of influences per bone is greater than 4",
        NormalBlock: "A Vector3 representing the normal of each vertex of the attached mesh",
        PositionBlock: "A Vector3 representing the position of each vertex of the attached mesh",
        TangentBlock: "A Vector3 representing the tangent of each vertex of the attached mesh",
        UVBlock: "A Vector2 representing the UV coordinates of each vertex of the attached mesh",
        WorldNormal: "A Vector4 representing the normal of each vertex of the attached mesh transformed into world space",
        WorldTangent: "A Vector4 representing the tangent of each vertex of the attached mesh transformed into world space",
        PerturbNormalBlock: "Creates high-frequency detail normal vectors based on a normal map, the world position, and world normal",
        TBNBlock: "Creates a TBN matrix from normal, tangent, and bitangent vectors",
        NormalBlend: "Outputs the result of blending two normal maps together using a per-channel screen",
        WorldPosition: "A Vector4 representing the position of each vertex of the attached mesh transformed into world space",
        DiscardBlock: "A final node that will not output a pixel below the cutoff value",
        FragmentOutputBlock: "A mandatory final node for outputing the color of each pixel",
        PrePassOutputBlock: "An optional final node for outputing geometry data on prepass textures",
        VertexOutputBlock: "A mandatory final node for outputing the position of each vertex",
        SmartFilterFragmentOutputBlock: "A mandatory final node for outputing the color of each pixel in Smart Filters mode",
        ClampBlock: "Outputs values above the maximum or below minimum as maximum or minimum values respectively",
        NormalizeBlock: "Remaps the length of a vector or color to 1",
        RemapBlock: "Remaps input value between sourceMin and sourceMax to a new range between targetMin and targetMax",
        CeilingBlock: "Outputs fractional values as the next higher whole number",
        FloorBlock: "Outputs fractional values as the next lower whole number",
        RoundBlock: "Outputs fractional values rounded to the nearest whole number",
        ModBlock: "Outputs the value of one parameter modulo another",
        CameraPositionBlock: "Outputs a Vector3 position of the active scene camera",
        CameraParametersBlock: "Outputs a Vector4 containing (-1 for webGL and 1 for webGPU, camera.minZ, camera.maxZ, 1 / camera.maxZ)",
        FogBlock: "Applies fog to the scene with an increasing opacity based on distance from the camera",
        FogColorBlock: "The system value for fog color pulled from the scene",
        ImageProcessingBlock: "Provides access to all of the Babylon image processing properties",
        LightBlock: "Outputs diffuse and specular contributions from one or more scene lights",
        LightInformationBlock: "Provides the direction, color and intensity of a selected light based on its world position",
        ReflectionTextureBlock: "Creates a reflection from the input texture",
        ViewDirectionBlock: "Outputs the direction vector of where the camera is aimed",
        AbsBlock: "Outputs the absolute value of the input value",
        ArcCosBlock: "Outputs the inverse of the cosine value based on the input value",
        ArcSinBlock: "Outputs the inverse of the sine value based on the input value",
        ArcTan2Block: "Outputs the inverse of the tangent value based on the input value",
        ArcTanBlock: "Outputs the inverse of the tangent value based on the input value",
        SetBlock: "Outputs the alias based on the input value",
        CosBlock: "Outputs the cosine value based on the input value",
        DegreesToRadiansBlock: "Converts the input degrees value to radians",
        Exp2Block: "Outputs the input value multiplied by itself 1 time. (Exponent of 2)",
        ExpBlock: "Outputs the input value multiplied by itself 9 time. (Exponent of 10)",
        FractBlock: "Outputs only the fractional value of a floating point number",
        LogBlock: "The logarithmic value based on the input value",
        PowBlock: "Outputs the input value multiplied by itself the number of times equal to the power input (Exponent of power)",
        RadiansToDegreesBlock: "Converts the input radians value to degrees",
        SawToothWaveBlock: "Outputs a sawtooth pattern value between -1 and 1 based on the input value",
        SignBlock: "returns 1 if the input is positive, 0 if input is equal to 0, or -1 if the input is negative",
        SinBlock: "Outputs the sine value based on the input value",
        SqrtBlock: "Outputs the square root of the input value",
        SquareWaveBlock: "Outputs a stepped pattern value between -1 and 1 based on the input value",
        TanBlock: "Outputs the tangent value based on the input value",
        TriangleWaveBlock: "Outputs a sawtooth pattern value between 0 and 1 based on the input value",
        CrossBlock: "Outputs a vector that is perpendicular to two input vectors",
        DotBlock: "Outputs the cos of the angle between two vectors",
        FresnelBlock: "Outputs the grazing angle of the surface of the mesh, relative to a camera influenced by the bias and power inputs",
        TransformBlock: "Transforms a input vector based on the input matrix",
        DerivativeBlock: "FRAGMENT SHADER ONLY. Provides the rate of change for an input on a given axis (x,y).",
        DesaturateBlock: "Convert a color input into a grayscale representation.",
        WorldViewMatrixBlock: "A matrix to remap points in 3D local space to 3D world space, and ending in 2D camera space.",
        FrontFacingBlock: "Returns 1 if a mesh triangle faces the normal direction and 0 if it does not.",
        SimplexPerlin3DBlock: "Creates a type of gradient noise with few directional artifacts.",
        WorleyNoise3DBlock: "Creates a random pattern resembling cells.",
        ReflectBlock: "Outputs the direction of the input vector reflected across the surface normal.",
        RefractBlock: "Outputs a direction simulating a deflection of the input vector.",
        Rotate2dBlock: "Rotates UV coordinates around the W axis.",
        PBRMetallicRoughnessBlock: "PBR metallic/roughness material",
        SheenBlock: "PBR Sheen block",
        AnisotropyBlock: "PBR Anisotropy block",
        ReflectionBlock: "PBR Reflection block",
        ClearCoatBlock: "PBR ClearCoat block",
        RefractionBlock: "PBR Refraction block",
        SubSurfaceBlock: "PBR SubSurface block",
        IridescenceBlock: "PBR Iridescence block",
        ScreenPositionBlock: "A Vector2 representing the position of each vertex of the screen quad (derived from UV set from the quad used to render)",
        CurrentScreenBlock: "The screen buffer used as input for the post process",
        ParticleUVBlock: "The particle uv texture coordinate",
        ParticleTextureBlock: "The particle texture",
        ParticleColorBlock: "The particle color",
        ParticleTextureMaskBlock: "The particle texture mask",
        ParticleRampGradientBlock: "The particle ramp gradient block",
        ParticleBlendMultiplyBlock: "The particle blend multiply block",
        ParticlePositionWorldBlock: "The world position of the particle",
        ScreenUVBlock: "The screen quad's UV texture coordinates",
        GaussianSplattingBlock: "The gaussian splatting block",
        GaussianBlock: "The gaussian color computation block",
        SplatReaderBlock: "The gaussian splat reader block",
        SplatIndexBlock: "The splat index",
        FragCoordBlock: "The gl_FragCoord predefined variable that contains the window relative coordinate (x, y, z, 1/w)",
        ScreenSizeBlock: "The size (in pixels) of the screen window",
        SceneDepthBlock: "The scene depth buffer",
        MatrixBuilderBlock: "Converts 4 Vector4 into a matrix",
        EqualBlock: "Return a value if two operands are equals",
        NotEqualBlock: "Return a value if two operands are not equals",
        LessThanBlock: "Return a value if an operand is smaller than a second operand",
        LessOrEqualBlock: "Return a value if an operand is smaller or equal to a second operand",
        GreaterThanBlock: "Return a value if an operand is greater than a second operand",
        GreaterOrEqualBlock: "Return a value if an operand is greater or equal to a second operand",
        XorBlock: "Return a value if (a xor b) > 0",
        OrBlock: "Return a value if (a or b) > 0",
        AndBlock: "Return a value if (a and b) > 0",
        ImageSourceBlock: "Centralize texture access for TextureBlocks",
        DepthSourceBlock: "Centralize depth texture access for TextureBlocks",
        CloudBlock: "Generate Fractal Brownian Motion Clouds",
        VoronoiNoiseBlock: "Generate Voronoi Noise",
        ScreenSpaceBlock: "Convert a Vector3 or a Vector4 into screen space",
        TwirlBlock: "Apply a twirl rotation",
        ElbowBlock: "Passthrough block mostly used to organize your graph",
        TeleportInBlock: "Passthrough block mostly used to organize your graph (but without visible lines). It works like a teleportation point for the graph.",
        TeleportOutBlock: "Endpoint for a TeleportInBlock.",
        ClipPlanesBlock: "A node that add clip planes support",
        HeightToNormalBlock: "Convert a height map into a normal map",
        FragDepthBlock: "A final node that sets the fragment depth",
        ShadowMapBlock: "Compute a depth value suitable for shadow map generation",
        TriPlanarBlock: "A node for reading a texture with triplanar mapping",
        BiPlanarBlock: "A node for reading a texture with biplanar mapping",
        MatrixDeterminantBlock: "Compute the determinant of a matrix",
        MatrixTransposeBlock: "Compute the transpose of a matrix",
        MeshAttributeExistsBlock: "Falls back to secondary input if specified attribute doesn't exists on the rendered mesh",
        CurveBlock: "Apply a curve function",
        ColorConverterBlock: "Converts between RGB and HSL color spaces",
        LoopBlock: "Block used to repeat code",
        StorageReadBlock: "Block used to read from a loop storage variable",
        StorageWriteBlock: "Block used to write to a loop storage variable",
        MatrixSplitterBlock: "Block used to split a matrix into Vector4",
        DebugBlock: "Block used to render intermediate debug values",
        SmartFilterTextureBlock: "Block used to add a Smart Filter Effect (SFE) shader interface",
    };

    private _customFrameList: { [key: string]: string };
    private _customBlockList: { [key: string]: string };

    constructor(props: INodeListComponentProps) {
        super(props);

        this.state = { filter: "" };

        const frameJson = localStorage.getItem("Custom-Frame-List");
        if (frameJson) {
            this._customFrameList = JSON.parse(frameJson);
        }

        const blockJson = localStorage.getItem("Custom-Block-List");
        if (blockJson) {
            this._customBlockList = JSON.parse(blockJson);
        }

        this._onResetRequiredObserver = this.props.globalState.onResetRequiredObservable.add(() => {
            this.forceUpdate();
        });
    }

    override componentWillUnmount() {
        this.props.globalState.onResetRequiredObservable.remove(this._onResetRequiredObserver);
    }

    filterContent(filter: string) {
        this.setState({ filter: filter });
    }

    loadCustomFrame(file: File) {
        Tools.ReadFile(
            file,
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            async (data) => {
                // get Frame Data from file
                const decoder = new TextDecoder("utf-8");
                const frameData = JSON.parse(decoder.decode(data));
                const frameName = frameData.editorData.frames[0].name + "Custom";
                const frameToolTip = frameData.editorData.frames[0].comments || "";

                try {
                    localStorage.setItem(frameName, JSON.stringify(frameData));
                } catch (error) {
                    this.props.globalState.stateManager.onErrorMessageDialogRequiredObservable.notifyObservers("Error Saving Frame");
                    return;
                }

                const frameJson = localStorage.getItem("Custom-Frame-List");
                let frameList: { [key: string]: string } = {};
                if (frameJson) {
                    frameList = JSON.parse(frameJson);
                }
                frameList[frameName] = frameToolTip;
                localStorage.setItem("Custom-Frame-List", JSON.stringify(frameList));
                this._customFrameList = frameList;
                this.forceUpdate();
            },
            undefined,
            true
        );
    }

    removeItem(value: string): void {
        const frameJson = localStorage.getItem("Custom-Frame-List");
        if (frameJson) {
            const registeredIdx = NodeLedger.RegisteredNodeNames.indexOf(value);
            if (registeredIdx !== -1) {
                NodeLedger.RegisteredNodeNames.splice(registeredIdx, 1);
            }
            const frameList = JSON.parse(frameJson);
            delete frameList[value];
            localStorage.removeItem(value);
            localStorage.setItem("Custom-Frame-List", JSON.stringify(frameList));
            this._customFrameList = frameList;
            this.forceUpdate();
        }
    }

    loadCustomBlock(file: File) {
        Tools.ReadFile(
            file,
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            async (data) => {
                // get Block Data from file
                const decoder = new TextDecoder("utf-8");
                const blockData = JSON.parse(decoder.decode(data));
                const blockName = (blockData.name || "") + "CustomBlock";
                const blockToolTip = blockData.comments || "";

                try {
                    localStorage.setItem(blockName, JSON.stringify(blockData));
                } catch (error) {
                    this.props.globalState.stateManager.onErrorMessageDialogRequiredObservable.notifyObservers("Error Saving Block");
                    return;
                }

                const blockJson = localStorage.getItem("Custom-Block-List");
                let blockList: { [key: string]: string } = {};
                if (blockJson) {
                    blockList = JSON.parse(blockJson);
                }
                blockList[blockName] = blockToolTip;
                localStorage.setItem("Custom-Block-List", JSON.stringify(blockList));
                this._customBlockList = blockList;
                this.forceUpdate();
            },
            undefined,
            true
        );
    }

    removeCustomBlock(value: string): void {
        const blockJson = localStorage.getItem("Custom-Block-List");
        if (blockJson) {
            const blockList = JSON.parse(blockJson);
            delete blockList[value];
            localStorage.removeItem(value);
            localStorage.setItem("Custom-Block-List", JSON.stringify(blockList));
            this._customBlockList = blockList;
            this.forceUpdate();
        }
    }

    renderFluent(blockMenu: JSX.Element[]) {
        return (
            <div>
                <SearchBar placeholder="Filter" onChange={(val) => this.filterContent(val.toString())} />
                <Accordion>{blockMenu}</Accordion>
            </div>
        );
    }

    renderOriginal(blockMenu: JSX.Element[]) {
        return (
            <div id="nmeNodeList">
                <div className="panes">
                    <div className="pane">
                        <div className="filter">
                            <input
                                type="text"
                                placeholder="Filter"
                                onFocus={() => (this.props.globalState.lockObject.lock = true)}
                                onBlur={() => {
                                    this.props.globalState.lockObject.lock = false;
                                }}
                                onChange={(evt) => this.filterContent(evt.target.value)}
                            />
                        </div>
                        <div className="list-container">{blockMenu}</div>
                    </div>
                </div>
            </div>
        );
    }

    override render() {
        const customFrameNames: string[] = [];
        for (const frame in this._customFrameList) {
            customFrameNames.push(frame);
        }

        const customBlockNames: string[] = [];
        for (const block in this._customBlockList) {
            customBlockNames.push(block);
        }

        // Block types used to create the menu from
        const allBlocks: Record<string, string[]> = {
            Custom_Frames: customFrameNames,
            Custom_Blocks: customBlockNames,
            SFE: ["ScreenUVBlock", "SmartFilterTextureBlock", "SmartFilterFragmentOutputBlock"],
            Animation: ["BonesBlock", "MorphTargetsBlock"],
            Color_Management: ["ReplaceColorBlock", "PosterizeBlock", "GradientBlock", "DesaturateBlock", "ColorConverterBlock"],
            Conversion_Blocks: ["ColorMergerBlock", "ColorSplitterBlock", "VectorMergerBlock", "VectorSplitterBlock"],
            Inputs: [
                "Float",
                "Vector2",
                "Vector3",
                "Vector4",
                "Color3",
                "Color4",
                "TextureBlock",
                "ReflectionTextureBlock",
                "MouseInfoBlock",
                "TimeBlock",
                "RealTimeBlock",
                "DeltaTimeBlock",
                "MaterialAlphaBlock",
                "FragCoordBlock",
                "ScreenSizeBlock",
                "ImageSourceBlock",
                "DepthSourceBlock",
                "TriPlanarBlock",
                "BiPlanarBlock",
            ],
            Interpolation: ["LerpBlock", "StepBlock", "SmoothStepBlock", "NLerpBlock"],
            Logical: ["EqualBlock", "NotEqualBlock", "LessThanBlock", "LessOrEqualBlock", "GreaterThanBlock", "GreaterOrEqualBlock", "XorBlock", "OrBlock", "AndBlock"],
            Math__Standard: [
                "AddBlock",
                "DivideBlock",
                "MaxBlock",
                "MinBlock",
                "ModBlock",
                "MultiplyBlock",
                "NegateBlock",
                "OneMinusBlock",
                "ReciprocalBlock",
                "ScaleBlock",
                "SignBlock",
                "SqrtBlock",
                "SubtractBlock",
            ],
            Math__Scientific: [
                "AbsBlock",
                "ArcCosBlock",
                "ArcSinBlock",
                "ArcTanBlock",
                "ArcTan2Block",
                "CosBlock",
                "CurveBlock",
                "DegreesToRadiansBlock",
                "ExpBlock",
                "Exp2Block",
                "FractBlock",
                "LogBlock",
                "PowBlock",
                "RadiansToDegreesBlock",
                "SawToothWaveBlock",
                "SinBlock",
                "SquareWaveBlock",
                "TanBlock",
                "TriangleWaveBlock",
                "SetBlock",
            ],
            Math__Vector: [
                "CrossBlock",
                "DerivativeBlock",
                "DistanceBlock",
                "DotBlock",
                "FresnelBlock",
                "LengthBlock",
                "ReflectBlock",
                "RefractBlock",
                "Rotate2dBlock",
                "TransformBlock",
                "ScreenSpaceBlock",
                "TwirlBlock",
            ],
            Matrices: [
                "Matrix",
                "WorldMatrixBlock",
                "WorldViewMatrixBlock",
                "WorldViewProjectionMatrixBlock",
                "ViewMatrixBlock",
                "ViewProjectionMatrixBlock",
                "ProjectionMatrixBlock",
                "MatrixBuilderBlock",
                "MatrixDeterminantBlock",
                "MatrixTransposeBlock",
                "MatrixSplitterBlock",
            ],
            Misc: ["ElbowBlock", "ShadowMapBlock", "TeleportInBlock", "TeleportOutBlock", "DebugBlock"],
            Mesh: [
                "InstancesBlock",
                "PositionBlock",
                "UVBlock",
                "ColorBlock",
                "InstanceColorBlock",
                "NormalBlock",
                "HeightToNormalBlock",
                "TBNBlock",
                "PerturbNormalBlock",
                "NormalBlendBlock",
                "TangentBlock",
                "MatrixIndicesBlock",
                "MatrixWeightsBlock",
                "MatrixIndicesExtraBlock",
                "MatrixWeightsExtraBlock",
                "WorldPositionBlock",
                "WorldNormalBlock",
                "WorldTangentBlock",
                "FrontFacingBlock",
                "MeshAttributeExistsBlock",
            ],
            Loop: ["LoopBlock", "StorageReadBlock", "StorageWriteBlock"],
            Noises: ["RandomNumberBlock", "SimplexPerlin3DBlock", "WorleyNoise3DBlock", "CloudBlock", "VoronoiNoiseBlock"],
            Output_Nodes: ["VertexOutputBlock", "FragmentOutputBlock", "PrePassOutputBlock", "DiscardBlock", "ClipPlanesBlock", "FragDepthBlock"],
            Particle: [
                "ParticleBlendMultiplyBlock",
                "ParticleColorBlock",
                "ParticlePositionWorldBlock",
                "ParticleRampGradientBlock",
                "ParticleTextureBlock",
                "ParticleTextureMaskBlock",
                "ParticleUVBlock",
            ],
            GaussianSplatting: ["GaussianSplattingBlock", "SplatIndexBlock", "SplatReaderBlock", "GaussianBlock"],
            PBR: ["PBRMetallicRoughnessBlock", "AnisotropyBlock", "ClearCoatBlock", "IridescenceBlock", "ReflectionBlock", "RefractionBlock", "SheenBlock", "SubSurfaceBlock"],
            PostProcess: ["ScreenPositionBlock", "CurrentScreenBlock", "PrePassTextureBlock"],
            Procedural__Texture: ["ScreenPositionBlock"],
            Range: ["ClampBlock", "RemapBlock", "NormalizeBlock"],
            Round: ["RoundBlock", "CeilingBlock", "FloorBlock"],
            Scene: [
                "FogBlock",
                "CameraPositionBlock",
                "CameraParametersBlock",
                "FogColorBlock",
                "ImageProcessingBlock",
                "LightBlock",
                "LightInformationBlock",
                "ViewDirectionBlock",
                "SceneDepthBlock",
            ],
        };

        let excludeNodes: Record<string, string[]> = {};
        let excludeCategories: string[] = [];
        switch (this.props.globalState.mode) {
            case NodeMaterialModes.Material:
                excludeCategories = ["SFE", "PostProcess", "Particle", "Procedural__Texture", "GaussianSplatting"];
                break;
            case NodeMaterialModes.SFE:
                excludeCategories = ["Animation", "Mesh", "Particle", "Procedural__Texture", "PostProcess", "PBR", "Scene", "GaussianSplatting"];
                excludeNodes = {
                    Output_Nodes: ["VertexOutputBlock", "FragmentOutputBlock", "PrePassOutputBlock", "ClipPlanesBlock", "FragDepthBlock"],
                    Inputs: [
                        "TextureBlock",
                        "MaterialAlphaBlock",
                        "BiPlanarBlock",
                        "TriPlanarBlock",
                        "ReflectionTextureBlock",
                        "ImageSourceBlock",
                        "DeltaTimeBlock",
                        "RealTimeBlock",
                        "MouseInfoBlock",
                    ],
                    Matrices: [
                        "WorldMatrixBlock",
                        "WorldViewMatrixBlock",
                        "WorldViewProjectionMatrixBlock",
                        "ViewMatrixBlock",
                        "ViewProjectionMatrixBlock",
                        "ProjectionMatrixBlock",
                    ],
                    Misc: ["ShadowMapBlock"],
                    Math__Vector: ["ScreenSpaceBlock"],
                };
                break;
            case NodeMaterialModes.PostProcess:
                excludeCategories = ["SFE", "Animation", "Mesh", "Particle", "Procedural__Texture", "PBR", "GaussianSplatting"];
                excludeNodes = {
                    Output_Nodes: ["PrePassOutputBlock"],
                };
                break;
            case NodeMaterialModes.ProceduralTexture:
                excludeCategories = ["SFE", "Animation", "Mesh", "Particle", "PostProcess", "PBR", "GaussianSplatting"];
                excludeNodes = {
                    Output_Nodes: ["PrePassOutputBlock"],
                };
                break;
            case NodeMaterialModes.Particle:
                excludeCategories = ["SFE", "Animation", "Mesh", "PostProcess", "Procedural__Texture", "PBR", "GaussianSplatting"];
                excludeNodes = {
                    Output_Nodes: ["VertexOutputBlock", "PrePassOutputBlock"],
                    Scene: ["FogBlock", "FogColorBlock"],
                };
                break;
            case NodeMaterialModes.GaussianSplatting:
                excludeCategories = ["SFE", "Animation", "Mesh", "PostProcess", "Procedural__Texture", "PBR"];
                excludeNodes = {
                    Output_Nodes: ["VertexOutputBlock", "PrePassOutputBlock"],
                    Scene: ["FogBlock", "FogColorBlock"],
                };
                break;
        }
        for (const category in excludeNodes) {
            allBlocks[category] = allBlocks[category].filter((node) => !excludeNodes[category].includes(node));
        }
        for (const category of excludeCategories) {
            if (allBlocks[category]) {
                delete allBlocks[category];
            }
        }

        // Create node menu
        const blockMenu: JSX.Element[] = [];
        for (const key in allBlocks) {
            const blockList = allBlocks[key]
                .filter((b: string) => !this.state.filter || b.toLowerCase().indexOf(this.state.filter.toLowerCase()) !== -1)
                .sort((a: string, b: string) => a.localeCompare(b))
                .map((block: any) => {
                    if (key === "Custom_Frames") {
                        return (
                            <DraggableLineWithButtonComponent
                                key={block}
                                format={"babylonjs-material-node"}
                                data={block}
                                tooltip={this._customFrameList[block] || ""}
                                iconImage={deleteButton}
                                iconTitle="Delete"
                                onIconClick={(value) => this.removeItem(value)}
                            />
                        );
                    } else if (key === "Custom_Blocks") {
                        return (
                            <DraggableLineWithButtonComponent
                                key={block}
                                format={"babylonjs-material-node"}
                                data={block}
                                tooltip={this._customBlockList[block] || ""}
                                iconImage={deleteButton}
                                iconTitle="Delete"
                                onIconClick={(value) => this.removeCustomBlock(value)}
                                lenSuffixToRemove={11}
                            />
                        );
                    }
                    return <DraggableLineComponent key={block} format={"babylonjs-material-node"} data={block} tooltip={NodeListComponent._Tooltips[block] || ""} />;
                });

            if (key === "Custom_Frames") {
                const line = (
                    <LineWithFileButtonComponent
                        key="add..."
                        title={"Add Custom Frame"}
                        closed={false}
                        multiple={true}
                        label="Add..."
                        uploadName={"custom-frame-upload"}
                        iconImage={addButton}
                        accept=".json"
                        onIconClick={(file) => {
                            this.loadCustomFrame(file);
                        }}
                    />
                );
                blockList.push(line);
            } else if (key === "Custom_Blocks") {
                const line = (
                    <LineWithFileButtonComponent
                        key="add..."
                        title={"Add Custom Block"}
                        closed={false}
                        multiple={true}
                        label="Add..."
                        uploadName={"custom-block-upload"}
                        iconImage={addButton}
                        accept=".json"
                        onIconClick={(file) => {
                            this.loadCustomBlock(file);
                        }}
                    />
                );
                blockList.push(line);
            }
            if (blockList.length) {
                blockMenu.push(
                    <LineContainerComponent key={key + " blocks"} title={key.replace("__", ": ").replace("_", " ")} closed={false}>
                        {blockList}
                    </LineContainerComponent>
                );
            }

            // Register blocks
            const ledger = NodeLedger.RegisteredNodeNames;
            ledger.length = 0;
            for (const key in allBlocks) {
                const blocks = allBlocks[key] as string[];
                if (blocks.length) {
                    for (const block of blocks) {
                        if (!ledger.includes(block)) {
                            ledger.push(block);
                        }
                    }
                }
            }
            NodeLedger.NameFormatter = (name) => {
                let finalName = name;
                // custom frame
                if (name.endsWith("Custom")) {
                    const nameIndex = name.lastIndexOf("Custom");
                    finalName = name.substring(0, nameIndex);
                    finalName += " [custom]";
                } else {
                    finalName = name.replace("Block", "");
                }
                return finalName;
            };
        }

        return <ToolContext.Consumer>{({ useFluent }) => (useFluent ? this.renderFluent(blockMenu) : this.renderOriginal(blockMenu))}</ToolContext.Consumer>;
    }
}
