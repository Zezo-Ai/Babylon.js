import * as React from "react";
import { GeneralPropertyTabComponent } from "./genericNodePropertyComponent";
import type { IPropertyComponentProps } from "shared-ui-components/nodeGraphSystem/interfaces/propertyComponentProps";
import type { Observer } from "core/Misc/observable";
import type { Nullable } from "core/types";
import { LineContainerComponent } from "shared-ui-components/lines/lineContainerComponent";
import { OptionsLine } from "shared-ui-components/lines/optionsLineComponent";
import type { ParticleTeleportOutBlock } from "core/Particles/Node/Blocks/Teleport/particleTeleportOutBlock";
import type { ParticleTeleportInBlock } from "core/Particles/Node/Blocks/Teleport/particleTeleportInBlock";
import type { GlobalState } from "node-particle-editor/globalState";

export class TeleportOutPropertyTabComponent extends React.Component<IPropertyComponentProps> {
    private _onUpdateRequiredObserver: Nullable<Observer<any>>;

    constructor(props: IPropertyComponentProps) {
        super(props);
    }

    override componentDidMount() {
        this._onUpdateRequiredObserver = this.props.stateManager.onUpdateRequiredObservable.add(() => {
            this.forceUpdate();
        });
    }

    override componentWillUnmount() {
        this.props.stateManager.onUpdateRequiredObservable.remove(this._onUpdateRequiredObserver);
    }

    override render() {
        const block = this.props.nodeData.data as ParticleTeleportOutBlock;

        const options = [{ label: "None", value: -1 }];
        const teleporters: ParticleTeleportInBlock[] = [];

        const nodeParticleSet = (this.props.stateManager.data as GlobalState).nodeParticleSet;

        for (const block of nodeParticleSet.attachedBlocks) {
            if (block.getClassName() === "ParticleTeleportInBlock") {
                teleporters.push(block as ParticleTeleportInBlock);
            }
        }

        teleporters.sort((a, b) => a.name.localeCompare(b.name));

        for (const block of teleporters) {
            options.push({ label: block.name, value: block.uniqueId });
        }

        return (
            <div>
                <GeneralPropertyTabComponent stateManager={this.props.stateManager} nodeData={this.props.nodeData} />
                <LineContainerComponent title="PROPERTIES">
                    <OptionsLine
                        label="Entry point"
                        options={options}
                        target={block}
                        propertyName="entryPoint"
                        noDirectUpdate={true}
                        onSelect={(value) => {
                            switch (value) {
                                case -1:
                                    block.detach();
                                    break;
                                default: {
                                    const source = teleporters.find((t) => t.uniqueId === value);
                                    source?.attachToEndpoint(block);
                                }
                            }

                            this.props.stateManager.onUpdateRequiredObservable.notifyObservers(block);
                            this.props.stateManager.onRebuildRequiredObservable.notifyObservers();
                            this.forceUpdate();
                        }}
                        extractValue={() => {
                            if (!block.entryPoint) {
                                return -1;
                            }

                            return block.entryPoint?.uniqueId;
                        }}
                    />
                </LineContainerComponent>
            </div>
        );
    }
}
