import { Camera } from "../../Cameras/camera";
import { ArcRotateCamera } from "../../Cameras/arcRotateCamera";
import { VRCameraMetrics } from "./vrCameraMetrics";
import type { Scene } from "../../scene";
import { Vector3 } from "../../Maths/math.vector";
import { Node } from "../../node";
import { _SetVrRigMode } from "../RigModes/vrRigMode";

import "../Inputs/arcRotateCameraVRDeviceOrientationInput";

Node.AddNodeConstructor("VRDeviceOrientationArcRotateCamera", (name, scene) => {
    return () => new VRDeviceOrientationArcRotateCamera(name, 0, 0, 1.0, Vector3.Zero(), scene);
});

/**
 * Camera used to simulate VR rendering (based on ArcRotateCamera)
 * @see https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction#vr-device-orientation-cameras
 */
export class VRDeviceOrientationArcRotateCamera extends ArcRotateCamera {
    /**
     * Creates a new VRDeviceOrientationArcRotateCamera
     * @param name defines camera name
     * @param alpha defines the camera rotation along the longitudinal axis
     * @param beta defines the camera rotation along the latitudinal axis
     * @param radius defines the camera distance from its target
     * @param target defines the camera target
     * @param scene defines the scene the camera belongs to
     * @param compensateDistortion defines if the camera needs to compensate the lens distortion
     * @param vrCameraMetrics defines the vr metrics associated to the camera
     */
    constructor(
        name: string,
        alpha: number,
        beta: number,
        radius: number,
        target: Vector3,
        scene?: Scene,
        compensateDistortion = true,
        vrCameraMetrics: VRCameraMetrics = VRCameraMetrics.GetDefault()
    ) {
        super(name, alpha, beta, radius, target, scene);

        vrCameraMetrics.compensateDistortion = compensateDistortion;
        this.setCameraRigMode(Camera.RIG_MODE_VR, { vrCameraMetrics: vrCameraMetrics });

        this.inputs.addVRDeviceOrientation();
    }

    /**
     * Gets camera class name
     * @returns VRDeviceOrientationArcRotateCamera
     */
    public override getClassName(): string {
        return "VRDeviceOrientationArcRotateCamera";
    }

    protected override _setRigMode = (rigParams: any) => _SetVrRigMode(this, rigParams);
}
