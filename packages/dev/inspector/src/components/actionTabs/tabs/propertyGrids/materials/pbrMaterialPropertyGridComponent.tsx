import * as React from "react";

import { Observable } from "core/Misc/observable";
import type { PBRMaterial } from "core/Materials/PBR/pbrMaterial";
import { Constants } from "core/Engines/constants";

import type { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { LineContainerComponent } from "shared-ui-components/lines/lineContainerComponent";
import { Color3LineComponent } from "shared-ui-components/lines/color3LineComponent";
import { CheckBoxLineComponent } from "shared-ui-components/lines/checkBoxLineComponent";
import { SliderLineComponent } from "shared-ui-components/lines/sliderLineComponent";
import { OptionsLine } from "shared-ui-components/lines/optionsLineComponent";
import { CommonMaterialPropertyGridComponent } from "./commonMaterialPropertyGridComponent";
import { TextureLinkLineComponent } from "../../../lines/textureLinkLineComponent";
import type { LockObject } from "shared-ui-components/tabs/propertyGrids/lockObject";
import type { GlobalState } from "../../../../globalState";
import { Vector2LineComponent } from "shared-ui-components/lines/vector2LineComponent";

import "core/Materials/material.decalMap";
import "core/Rendering/prePassRendererSceneComponent";
import "core/Rendering/subSurfaceSceneComponent";

interface IPBRMaterialPropertyGridComponentProps {
    globalState: GlobalState;
    material: PBRMaterial;
    lockObject: LockObject;
    onSelectionChangedObservable?: Observable<any>;
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>;
}

/**
 * @internal
 */
export class PBRMaterialPropertyGridComponent extends React.Component<IPBRMaterialPropertyGridComponentProps> {
    private _onDebugSelectionChangeObservable = new Observable<TextureLinkLineComponent>();
    constructor(props: IPBRMaterialPropertyGridComponentProps) {
        super(props);
    }

    switchAmbientMode(state: boolean) {
        this.props.material.debugMode = state ? 21 : 0;
    }

    renderTextures(onDebugSelectionChangeObservable: Observable<TextureLinkLineComponent>) {
        const material = this.props.material;

        return (
            <LineContainerComponent title="CHANNELS" selection={this.props.globalState}>
                <TextureLinkLineComponent
                    label="Albedo"
                    texture={material.albedoTexture}
                    propertyName="albedoTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Base Weight"
                    texture={material.baseWeightTexture}
                    propertyName="baseWeightTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Base Diffuse Roughness"
                    texture={material.baseDiffuseRoughnessTexture}
                    propertyName="baseDiffuseRoughnessTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Metallic Roughness"
                    texture={material.metallicTexture}
                    propertyName="metallicTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Reflection"
                    texture={material.reflectionTexture}
                    propertyName="reflectionTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Refraction"
                    texture={material.refractionTexture}
                    propertyName="refractionTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Reflectivity"
                    texture={material.reflectivityTexture}
                    propertyName="reflectivityTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Micro-surface"
                    texture={material.microSurfaceTexture}
                    propertyName="microSurfaceTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Bump"
                    texture={material.bumpTexture}
                    propertyName="bumpTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Emissive"
                    texture={material.emissiveTexture}
                    propertyName="emissiveTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Opacity"
                    texture={material.opacityTexture}
                    propertyName="opacityTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    customDebugAction={(state) => this.switchAmbientMode(state)}
                    label="Ambient"
                    texture={material.ambientTexture}
                    propertyName="ambientTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Lightmap"
                    texture={material.lightmapTexture}
                    propertyName="lightmapTexture"
                    material={material}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <TextureLinkLineComponent
                    label="Detailmap"
                    texture={material.detailMap.texture}
                    material={material}
                    onTextureCreated={(texture) => (material.detailMap.texture = texture)}
                    onTextureRemoved={() => (material.detailMap.texture = null)}
                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                    onDebugSelectionChangeObservable={onDebugSelectionChangeObservable}
                />
                <CheckBoxLineComponent
                    label="Use lightmap as shadowmap"
                    target={material}
                    propertyName="useLightmapAsShadowmap"
                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                />
                <CheckBoxLineComponent
                    label="Use detailmap"
                    target={material.detailMap}
                    propertyName="isEnabled"
                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                />
                {material.decalMap && (
                    <CheckBoxLineComponent
                        label="Use decalmap"
                        target={material.decalMap}
                        propertyName="isEnabled"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                )}
            </LineContainerComponent>
        );
    }

    override render() {
        const material = this.props.material;

        const debugMode = [
            { label: "None", value: 0 },
            // Geometry
            { label: "Normalized position", value: 1 },
            { label: "Normals", value: 2 },
            { label: "Tangents", value: 3 },
            { label: "Bitangents", value: 4 },
            { label: "Bump Normals", value: 5 },
            { label: "UV1", value: 6 },
            { label: "UV2", value: 7 },
            { label: "ClearCoat Normals", value: 8 },
            { label: "ClearCoat Tangents", value: 9 },
            { label: "ClearCoat Bitangents", value: 10 },
            { label: "Anisotropic Normals", value: 11 },
            { label: "Anisotropic Tangents", value: 12 },
            { label: "Anisotropic Bitangents", value: 13 },
            // Maps
            { label: "Albedo Map", value: 20 },
            { label: "Ambient Map", value: 21 },
            { label: "Opacity Map", value: 22 },
            { label: "Emissive Map", value: 23 },
            { label: "Light Map", value: 24 },
            { label: "Metallic Map", value: 25 },
            { label: "Reflectivity Map", value: 26 },
            { label: "ClearCoat Map", value: 27 },
            { label: "ClearCoat Tint Map", value: 28 },
            { label: "Sheen Map", value: 29 },
            { label: "Anisotropic Map", value: 30 },
            { label: "Thickness Map", value: 31 },
            { label: "Bump Map", value: 32 },
            // Env
            { label: "Env Refraction", value: 40 },
            { label: "Env Reflection", value: 41 },
            { label: "Env Clear Coat", value: 42 },
            // Lighting
            { label: "Direct Diffuse", value: 50 },
            { label: "Direct Specular", value: 51 },
            { label: "Direct Clear Coat", value: 52 },
            { label: "Direct Sheen", value: 53 },
            { label: "Env Irradiance", value: 54 },
            // Lighting Params
            { label: "Surface Albedo", value: 60 },
            { label: "Reflectance 0", value: 61 },
            { label: "Metallic", value: 62 },
            { label: "Metallic F0", value: 71 },
            { label: "Roughness", value: 63 },
            { label: "AlphaG", value: 64 },
            { label: "NdotV", value: 65 },
            { label: "ClearCoat Color", value: 66 },
            { label: "ClearCoat Roughness", value: 67 },
            { label: "ClearCoat NdotV", value: 68 },
            { label: "Transmittance", value: 69 },
            { label: "Refraction Transmittance", value: 70 },
            { label: "Glossiness", value: 72 },
            { label: "Base Color", value: 73 },
            { label: "Specular Color", value: 74 },
            { label: "Emissive Color", value: 75 },
            // Misc
            { label: "SEO", value: 80 },
            { label: "EHO", value: 81 },
            { label: "Energy Factor", value: 82 },
            { label: "Specular Reflectance", value: 83 },
            { label: "Clear Coat Reflectance", value: 84 },
            { label: "Sheen Reflectance", value: 85 },
            { label: "Luminance Over Alpha", value: 86 },
            { label: "Alpha", value: 87 },
            { label: "Albedo Alpha", value: 88 },
            { label: "Ambient occlusion color", value: 89 },
        ];

        const realTimeFilteringQualityOptions = [
            { label: "Low", value: Constants.TEXTURE_FILTERING_QUALITY_LOW },
            { label: "Medium", value: Constants.TEXTURE_FILTERING_QUALITY_MEDIUM },
            { label: "High", value: Constants.TEXTURE_FILTERING_QUALITY_HIGH },
        ];

        const baseDiffuseModelOptions = [
            { label: "Lambert", value: Constants.MATERIAL_DIFFUSE_MODEL_LAMBERT },
            { label: "Burley", value: Constants.MATERIAL_DIFFUSE_MODEL_BURLEY },
            { label: "OpenPBR", value: Constants.MATERIAL_DIFFUSE_MODEL_E_OREN_NAYAR },
        ];

        const dielectricSpecularModelOptions = [
            { label: "glTF", value: Constants.MATERIAL_DIELECTRIC_SPECULAR_MODEL_GLTF },
            { label: "OpenPBR", value: Constants.MATERIAL_DIELECTRIC_SPECULAR_MODEL_OPENPBR },
        ];

        const conductorSpecularModelOptions = [
            { label: "glTF", value: Constants.MATERIAL_CONDUCTOR_SPECULAR_MODEL_GLTF },
            { label: "OpenPBR", value: Constants.MATERIAL_CONDUCTOR_SPECULAR_MODEL_OPENPBR },
        ];

        (material.sheen as any)._useRoughness = (material.sheen as any)._useRoughness ?? material.sheen.roughness !== null;
        material.sheen.roughness = material.sheen.roughness ?? (material.sheen as any)._saveRoughness ?? 0;

        if (!(material.sheen as any)._useRoughness) {
            (material.sheen as any)._saveRoughness = material.sheen.roughness;
            material.sheen.roughness = null;
        }

        return (
            <>
                <CommonMaterialPropertyGridComponent
                    globalState={this.props.globalState}
                    lockObject={this.props.lockObject}
                    material={material}
                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                />
                {this.renderTextures(this._onDebugSelectionChangeObservable)}
                <LineContainerComponent title="LIGHTING & COLORS" selection={this.props.globalState}>
                    <Color3LineComponent
                        lockObject={this.props.lockObject}
                        label="Albedo"
                        target={material}
                        propertyName="albedoColor"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        isLinear={true}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Base Weight"
                        target={material}
                        propertyName="baseWeight"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <Color3LineComponent
                        lockObject={this.props.lockObject}
                        label="Reflectivity"
                        target={material}
                        propertyName="reflectivityColor"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        isLinear={true}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Micro-surface"
                        target={material}
                        propertyName="microSurface"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <Color3LineComponent
                        lockObject={this.props.lockObject}
                        label="Emissive"
                        target={material}
                        propertyName="emissiveColor"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        isLinear={true}
                    />
                    <Color3LineComponent
                        lockObject={this.props.lockObject}
                        label="Ambient"
                        target={material}
                        propertyName="ambientColor"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        isLinear={true}
                    />
                    <CheckBoxLineComponent
                        label="Use physical light falloff"
                        target={material}
                        propertyName="usePhysicalLightFalloff"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                </LineContainerComponent>
                <LineContainerComponent title="METALLIC WORKFLOW" selection={this.props.globalState}>
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Metallic"
                        target={material}
                        propertyName="metallic"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Roughness"
                        target={material}
                        propertyName="roughness"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Base Diffuse Roughness"
                        target={material}
                        propertyName="baseDiffuseRoughness"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Index of Refraction"
                        target={material}
                        propertyName="indexOfRefraction"
                        minimum={1}
                        maximum={3}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="F0 Factor"
                        target={material}
                        propertyName="metallicF0Factor"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <Color3LineComponent
                        lockObject={this.props.lockObject}
                        label="Reflectance Color"
                        target={material}
                        propertyName="metallicReflectanceColor"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        isLinear={true}
                    />
                    <CheckBoxLineComponent
                        label="Use only metallic from MetallicReflectance texture"
                        target={material}
                        propertyName="useOnlyMetallicFromMetallicReflectanceTexture"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <TextureLinkLineComponent
                        label="MetallicReflectance Texture"
                        texture={material.metallicReflectanceTexture}
                        onTextureCreated={(texture) => (material.metallicReflectanceTexture = texture)}
                        onTextureRemoved={() => (material.metallicReflectanceTexture = null)}
                        material={material}
                        onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                        onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                    />
                    <TextureLinkLineComponent
                        label="Reflectance Texture"
                        texture={material.reflectanceTexture}
                        onTextureCreated={(texture) => (material.reflectanceTexture = texture)}
                        onTextureRemoved={() => (material.reflectanceTexture = null)}
                        material={material}
                        onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                        onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                    />
                </LineContainerComponent>
                <LineContainerComponent title="CLEAR COAT" selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Enabled"
                        target={material.clearCoat}
                        propertyName="isEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.clearCoat.isEnabled && (
                        <div className="fragment">
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={material.clearCoat}
                                propertyName="intensity"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Roughness"
                                target={material.clearCoat}
                                propertyName="roughness"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="IOR"
                                target={material.clearCoat}
                                propertyName="indexOfRefraction"
                                minimum={1.0}
                                maximum={3}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <CheckBoxLineComponent
                                label="Remap F0"
                                target={material.clearCoat}
                                propertyName="remapF0OnInterfaceChange"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <TextureLinkLineComponent
                                label="Clear coat"
                                texture={material.clearCoat.texture}
                                onTextureCreated={(texture) => (material.clearCoat.texture = texture)}
                                onTextureRemoved={() => (material.clearCoat.texture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <TextureLinkLineComponent
                                label="Roughness"
                                texture={material.clearCoat.textureRoughness}
                                onTextureCreated={(texture) => (material.clearCoat.textureRoughness = texture)}
                                onTextureRemoved={() => (material.clearCoat.textureRoughness = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <TextureLinkLineComponent
                                label="Bump"
                                texture={material.clearCoat.bumpTexture}
                                onTextureCreated={(texture) => (material.clearCoat.bumpTexture = texture)}
                                onTextureRemoved={() => (material.clearCoat.bumpTexture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            {material.clearCoat.bumpTexture && (
                                <SliderLineComponent
                                    lockObject={this.props.lockObject}
                                    label="Bump strength"
                                    target={material.clearCoat.bumpTexture}
                                    propertyName="level"
                                    minimum={0}
                                    maximum={2}
                                    step={0.01}
                                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                />
                            )}
                            <CheckBoxLineComponent
                                label="Use roughness from main texture"
                                target={material.clearCoat}
                                propertyName="useRoughnessFromMainTexture"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <CheckBoxLineComponent
                                label="Tint"
                                target={material.clearCoat}
                                propertyName="isTintEnabled"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            {material.clearCoat.isEnabled && material.clearCoat.isTintEnabled && (
                                <Color3LineComponent
                                    lockObject={this.props.lockObject}
                                    label="Tint Color"
                                    target={material.clearCoat}
                                    propertyName="tintColor"
                                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                    isLinear={true}
                                />
                            )}
                            {material.clearCoat.isEnabled && material.clearCoat.isTintEnabled && (
                                <SliderLineComponent
                                    lockObject={this.props.lockObject}
                                    label="At Distance"
                                    target={material.clearCoat}
                                    propertyName="tintColorAtDistance"
                                    minimum={0}
                                    maximum={20}
                                    step={0.1}
                                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                />
                            )}
                            {material.clearCoat.isEnabled && material.clearCoat.isTintEnabled && (
                                <SliderLineComponent
                                    lockObject={this.props.lockObject}
                                    label="Tint Thickness"
                                    target={material.clearCoat}
                                    propertyName="tintThickness"
                                    minimum={0}
                                    maximum={20}
                                    step={0.1}
                                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                />
                            )}
                            {material.clearCoat.isEnabled && material.clearCoat.isTintEnabled && (
                                <TextureLinkLineComponent
                                    label="Tint"
                                    texture={material.clearCoat.tintTexture}
                                    onTextureCreated={(texture) => (material.clearCoat.tintTexture = texture)}
                                    onTextureRemoved={() => (material.clearCoat.tintTexture = null)}
                                    material={material}
                                    onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                    onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                                />
                            )}
                        </div>
                    )}
                </LineContainerComponent>
                <LineContainerComponent title="IRIDESCENCE" selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Enabled"
                        target={material.iridescence}
                        propertyName="isEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.iridescence.isEnabled && (
                        <div className="fragment">
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={material.iridescence}
                                propertyName="intensity"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="IOR"
                                target={material.iridescence}
                                propertyName="indexOfRefraction"
                                minimum={1.0}
                                maximum={3}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Min Thickness"
                                target={material.iridescence}
                                propertyName="minimumThickness"
                                minimum={0}
                                maximum={1000}
                                step={10}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Max Thickness"
                                target={material.iridescence}
                                propertyName="maximumThickness"
                                minimum={0}
                                maximum={1000}
                                step={10}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <TextureLinkLineComponent
                                label="Iridescence"
                                texture={material.iridescence.texture}
                                onTextureCreated={(texture) => (material.iridescence.texture = texture)}
                                onTextureRemoved={() => (material.iridescence.texture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <TextureLinkLineComponent
                                label="Thickness"
                                texture={material.iridescence.thicknessTexture}
                                onTextureCreated={(texture) => (material.iridescence.thicknessTexture = texture)}
                                onTextureRemoved={() => (material.iridescence.thicknessTexture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                        </div>
                    )}
                </LineContainerComponent>
                <LineContainerComponent title="ANISOTROPIC" selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Enabled"
                        target={material.anisotropy}
                        propertyName="isEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.anisotropy.isEnabled && (
                        <div className="fragment">
                            <CheckBoxLineComponent
                                label="Legacy Mode"
                                target={material.anisotropy}
                                propertyName="legacy"
                                onValueChanged={() => this.forceUpdate()}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={material.anisotropy}
                                propertyName="intensity"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <Vector2LineComponent
                                lockObject={this.props.lockObject}
                                label="Direction"
                                target={material.anisotropy}
                                propertyName="direction"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <TextureLinkLineComponent
                                label="Anisotropic"
                                texture={material.anisotropy.texture}
                                onTextureCreated={(texture) => (material.anisotropy.texture = texture)}
                                onTextureRemoved={() => (material.anisotropy.texture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                        </div>
                    )}
                </LineContainerComponent>
                <LineContainerComponent title="SHEEN" selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Enabled"
                        target={material.sheen}
                        propertyName="isEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.sheen.isEnabled && (
                        <div className="fragment">
                            <CheckBoxLineComponent
                                label="Link to Albedo"
                                target={material.sheen}
                                propertyName="linkSheenWithAlbedo"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={material.sheen}
                                propertyName="intensity"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <Color3LineComponent
                                lockObject={this.props.lockObject}
                                label="Color"
                                target={material.sheen}
                                propertyName="color"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                isLinear={true}
                            />
                            <TextureLinkLineComponent
                                label="Sheen"
                                texture={material.sheen.texture}
                                onTextureCreated={(texture) => (material.sheen.texture = texture)}
                                onTextureRemoved={() => (material.sheen.texture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <TextureLinkLineComponent
                                label="Roughness"
                                texture={material.sheen.textureRoughness}
                                onTextureCreated={(texture) => (material.sheen.textureRoughness = texture)}
                                onTextureRemoved={() => (material.sheen.textureRoughness = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <CheckBoxLineComponent label="Use roughness" target={material.sheen} propertyName="_useRoughness" />
                            {(material.sheen as any)._useRoughness && (
                                <SliderLineComponent
                                    lockObject={this.props.lockObject}
                                    label="Roughness"
                                    target={material.sheen}
                                    propertyName="roughness"
                                    minimum={0}
                                    maximum={1}
                                    step={0.01}
                                    onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                />
                            )}
                            <CheckBoxLineComponent
                                label="Use roughness from main texture"
                                target={material.sheen}
                                propertyName="useRoughnessFromMainTexture"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <CheckBoxLineComponent
                                label="Albedo scaling"
                                target={material.sheen}
                                propertyName="albedoScaling"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                        </div>
                    )}
                </LineContainerComponent>
                <LineContainerComponent title="SUBSURFACE" selection={this.props.globalState}>
                    <TextureLinkLineComponent
                        label="Thickness"
                        texture={material.subSurface.thicknessTexture}
                        onTextureCreated={(texture) => (material.subSurface.thicknessTexture = texture)}
                        onTextureRemoved={() => (material.subSurface.thicknessTexture = null)}
                        material={material}
                        onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                        onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Min Thickness"
                        target={material.subSurface}
                        propertyName="minimumThickness"
                        minimum={0}
                        maximum={10}
                        step={0.1}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Max Thickness"
                        target={material.subSurface}
                        propertyName="maximumThickness"
                        minimum={0}
                        maximum={10}
                        step={0.1}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Mask From Thickness"
                        target={material.subSurface}
                        propertyName="useMaskFromThicknessTexture"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="glTF-Style Textures"
                        target={material.subSurface}
                        propertyName="useGltfStyleTextures"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Use Thickness as Depth"
                        target={material.subSurface}
                        propertyName="useThicknessAsDepth"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <Color3LineComponent
                        lockObject={this.props.lockObject}
                        label="Tint Color"
                        target={material.subSurface}
                        propertyName="tintColor"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        isLinear={true}
                    />

                    <CheckBoxLineComponent
                        label="Scattering Enabled"
                        target={material.subSurface}
                        propertyName="isScatteringEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {(material.subSurface as any).isScatteringEnabled && material.getScene().prePassRenderer && material.getScene().subSurfaceConfiguration && (
                        <div className="fragment">
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Meters per unit"
                                target={material.getScene().subSurfaceConfiguration!}
                                propertyName="metersPerUnit"
                                minimum={0.01}
                                maximum={2}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                        </div>
                    )}
                    <CheckBoxLineComponent
                        label="Refraction Enabled"
                        target={material.subSurface}
                        propertyName="isRefractionEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.subSurface.isRefractionEnabled && (
                        <div className="fragment">
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={material.subSurface}
                                propertyName="refractionIntensity"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <TextureLinkLineComponent
                                label="Refraction Intensity"
                                texture={material.subSurface.refractionIntensityTexture}
                                onTextureCreated={(texture) => (material.subSurface.refractionIntensityTexture = texture)}
                                onTextureRemoved={() => (material.subSurface.refractionIntensityTexture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <TextureLinkLineComponent
                                label="Refraction"
                                texture={material.subSurface.refractionTexture}
                                onTextureCreated={(texture) => (material.subSurface.refractionTexture = texture)}
                                onTextureRemoved={() => (material.subSurface.refractionTexture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Volume Index of Refraction"
                                target={material.subSurface}
                                propertyName="volumeIndexOfRefraction"
                                minimum={1}
                                maximum={3}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Tint at Distance"
                                target={material.subSurface}
                                propertyName="tintColorAtDistance"
                                minimum={0}
                                maximum={10}
                                step={0.1}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <CheckBoxLineComponent
                                label="Link refraction with transparency"
                                target={material.subSurface}
                                propertyName="linkRefractionWithTransparency"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <CheckBoxLineComponent
                                label="Use albedo to tint surface transparency"
                                target={material.subSurface}
                                propertyName="useAlbedoToTintRefraction"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                        </div>
                    )}

                    <CheckBoxLineComponent
                        label="Dispersion Enabled"
                        target={material.subSurface}
                        propertyName="isDispersionEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.subSurface.isDispersionEnabled && (
                        <div className="fragment">
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={material.subSurface}
                                propertyName="dispersion"
                                minimum={0}
                                maximum={5}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                        </div>
                    )}
                    <CheckBoxLineComponent
                        label="Translucency Enabled"
                        target={material.subSurface}
                        propertyName="isTranslucencyEnabled"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.subSurface.isTranslucencyEnabled && (
                        <div className="fragment">
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={material.subSurface}
                                propertyName="translucencyIntensity"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <TextureLinkLineComponent
                                label="Intensity"
                                texture={material.subSurface.translucencyIntensityTexture}
                                onTextureCreated={(texture) => (material.subSurface.translucencyIntensityTexture = texture)}
                                onTextureRemoved={() => (material.subSurface.translucencyIntensityTexture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                            <Color3LineComponent
                                lockObject={this.props.lockObject}
                                label="Diffusion Distance"
                                target={material.subSurface}
                                propertyName="diffusionDistance"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                isLinear={true}
                            />
                            <CheckBoxLineComponent
                                label="Use albedo to tint surface translucency"
                                target={material.subSurface}
                                propertyName="useAlbedoToTintTranslucency"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <Color3LineComponent
                                lockObject={this.props.lockObject}
                                label="Translucency Tint"
                                target={material.subSurface}
                                propertyName="translucencyColor"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                                isLinear={true}
                            />
                            <TextureLinkLineComponent
                                label="Translucency Tint"
                                texture={material.subSurface.translucencyColorTexture}
                                onTextureCreated={(texture) => (material.subSurface.translucencyColorTexture = texture)}
                                onTextureRemoved={() => (material.subSurface.translucencyColorTexture = null)}
                                material={material}
                                onSelectionChangedObservable={this.props.onSelectionChangedObservable}
                                onDebugSelectionChangeObservable={this._onDebugSelectionChangeObservable}
                            />
                        </div>
                    )}
                </LineContainerComponent>
                <LineContainerComponent title="LEVELS" closed={true} selection={this.props.globalState}>
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Environment"
                        target={material}
                        propertyName="environmentIntensity"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Specular"
                        target={material}
                        propertyName="specularIntensity"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Emissive"
                        target={material}
                        propertyName="emissiveIntensity"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Direct"
                        target={material}
                        propertyName="directIntensity"
                        minimum={0}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {material.bumpTexture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Bump strength"
                            target={material.bumpTexture}
                            propertyName="level"
                            minimum={0}
                            maximum={2}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.ambientTexture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Ambient strength"
                            target={material}
                            propertyName="ambientTextureStrength"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.reflectionTexture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Reflection strength"
                            target={material.reflectionTexture}
                            propertyName="level"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.clearCoat.texture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Clear coat"
                            target={material.clearCoat.texture}
                            propertyName="level"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.clearCoat.bumpTexture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Clear coat bump"
                            target={material.clearCoat.bumpTexture}
                            propertyName="level"
                            minimum={0}
                            maximum={2}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.clearCoat.tintTexture && false /* level is not used for the clear coat tint texture */ && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Clear coat tint"
                            target={material.clearCoat.tintTexture}
                            propertyName="level"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.anisotropy.texture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Anisotropic"
                            target={material.anisotropy.texture}
                            propertyName="level"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.sheen.texture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Sheen"
                            target={material.sheen.texture}
                            propertyName="level"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.subSurface.thicknessTexture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Thickness"
                            target={material.subSurface.thicknessTexture}
                            propertyName="level"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.subSurface.refractionTexture && (
                        <SliderLineComponent
                            lockObject={this.props.lockObject}
                            label="Refraction"
                            target={material.subSurface.refractionTexture}
                            propertyName="level"
                            minimum={0}
                            maximum={1}
                            step={0.01}
                            onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                        />
                    )}
                    {material.detailMap.isEnabled && (
                        <>
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Detailmap diffuse"
                                target={material.detailMap}
                                propertyName="diffuseBlendLevel"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Detailmap bump"
                                target={material.detailMap}
                                propertyName="bumpLevel"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Detailmap roughness"
                                target={material.detailMap}
                                propertyName="roughnessBlendLevel"
                                minimum={0}
                                maximum={1}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                        </>
                    )}
                </LineContainerComponent>
                <LineContainerComponent title="RENDERING" closed={true} selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Alpha from albedo"
                        target={material}
                        propertyName="useAlphaFromAlbedoTexture"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Ambient in grayscale"
                        target={material}
                        propertyName="useAmbientInGrayScale"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Radiance over alpha"
                        target={material}
                        propertyName="useRadianceOverAlpha"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Micro-surface from ref. map alpha"
                        target={material}
                        propertyName="useMicroSurfaceFromReflectivityMapAlpha"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Specular over alpha"
                        target={material}
                        propertyName="useSpecularOverAlpha"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Specular anti-aliasing"
                        target={material}
                        propertyName="enableSpecularAntiAliasing"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Realtime Filtering"
                        target={material}
                        propertyName="realTimeFiltering"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <OptionsLine
                        allowNullValue={true}
                        label="Realtime Filtering quality"
                        options={realTimeFilteringQualityOptions}
                        target={material}
                        propertyName="realTimeFilteringQuality"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <OptionsLine
                        allowNullValue={true}
                        label="Base Diffuse Model"
                        options={baseDiffuseModelOptions}
                        target={material.brdf}
                        propertyName="baseDiffuseModel"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <OptionsLine
                        allowNullValue={true}
                        label="Dielectric Specular Model"
                        options={dielectricSpecularModelOptions}
                        target={material.brdf}
                        propertyName="dielectricSpecularModel"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <OptionsLine
                        allowNullValue={true}
                        label="Conductor Specular Model"
                        options={conductorSpecularModelOptions}
                        target={material.brdf}
                        propertyName="conductorSpecularModel"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                </LineContainerComponent>
                <LineContainerComponent title="NORMAL MAP" closed={true} selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Invert X axis"
                        target={material}
                        propertyName="invertNormalMapX"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Invert Y axis"
                        target={material}
                        propertyName="invertNormalMapY"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                </LineContainerComponent>
                <LineContainerComponent title="ADVANCED" closed={true} selection={this.props.globalState}>
                    <CheckBoxLineComponent
                        label="Energy Conservation"
                        target={material.brdf}
                        propertyName="useEnergyConservation"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Spherical Harmonics"
                        target={material.brdf}
                        propertyName="useSphericalHarmonics"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Radiance occlusion"
                        target={material}
                        propertyName="useRadianceOcclusion"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Horizon occlusion "
                        target={material}
                        propertyName="useHorizonOcclusion"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Mix irradiance with rough radiance"
                        target={material.brdf}
                        propertyName="mixIblRadianceWithIrradiance"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent
                        label="Use legacy specular energy conservation"
                        target={material.brdf}
                        propertyName="useLegacySpecularEnergyConservation"
                        onValueChanged={() => this.forceUpdate()}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <CheckBoxLineComponent label="Unlit" target={material} propertyName="unlit" onPropertyChangedObservable={this.props.onPropertyChangedObservable} />
                </LineContainerComponent>
                <LineContainerComponent title="DEBUG" closed={true} selection={this.props.globalState}>
                    <OptionsLine label="Debug mode" options={debugMode} target={material} propertyName="debugMode" />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Split position"
                        target={material}
                        propertyName="debugLimit"
                        minimum={-1}
                        maximum={1}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    <SliderLineComponent
                        lockObject={this.props.lockObject}
                        label="Output factor"
                        target={material}
                        propertyName="debugFactor"
                        minimum={0}
                        maximum={5}
                        step={0.01}
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                </LineContainerComponent>
            </>
        );
    }
}
