import * as react from "react";
import type { PropertyChangedEvent } from "shared-ui-components/propertyChangedEvent";
import type { Observable } from "core/Misc/observable";

export interface ICheckBoxLineComponentProps {
    label: string;
    target?: any;
    propertyName?: string;
    isSelected?: () => boolean;
    onSelect?: (value: boolean) => void;
    onValueChanged?: () => void;
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>;
    disabled?: boolean;
}

export class CheckBoxLineComponent extends react.Component<ICheckBoxLineComponentProps, { isSelected: boolean; isDisabled?: boolean }> {
    private static _UniqueIdSeed = 0;
    private _uniqueId: number;
    private _localChange = false;

    constructor(props: ICheckBoxLineComponentProps) {
        super(props);

        this._uniqueId = CheckBoxLineComponent._UniqueIdSeed++;

        if (this.props.isSelected) {
            this.state = { isSelected: this.props.isSelected() };
        } else {
            this.state = { isSelected: this.props.target[this.props.propertyName!] == true };
        }

        if (this.props.disabled) {
            this.state = { ...this.state, isDisabled: this.props.disabled };
        }
    }

    override shouldComponentUpdate(nextProps: ICheckBoxLineComponentProps, nextState: { isSelected: boolean; isDisabled: boolean }) {
        let currentState: boolean;

        if (nextProps.isSelected) {
            currentState = nextProps.isSelected!();
        } else {
            currentState = nextProps.target[nextProps.propertyName!] == true;
        }

        if (currentState !== nextState.isSelected || this._localChange) {
            nextState.isSelected = currentState;
            this._localChange = false;
            return true;
        }

        if (nextProps.disabled !== !!nextState.isDisabled) {
            return true;
        }

        return nextProps.label !== this.props.label || nextProps.target !== this.props.target;
    }

    onChange() {
        this._localChange = true;
        if (this.props.onSelect) {
            this.props.onSelect(!this.state.isSelected);
        } else {
            if (this.props.onPropertyChangedObservable) {
                this.props.onPropertyChangedObservable.notifyObservers({
                    object: this.props.target,
                    property: this.props.propertyName!,
                    value: !this.state.isSelected,
                    initialValue: this.state.isSelected,
                });
            }

            this.props.target[this.props.propertyName!] = !this.state.isSelected;
        }

        if (this.props.onValueChanged) {
            this.props.onValueChanged();
        }

        this.setState({ isSelected: !this.state.isSelected });
    }

    override render() {
        return (
            <div className="checkBoxLine">
                <div className="label" title={this.props.label}>
                    {this.props.label}
                </div>
                <div className="checkBox">
                    <input
                        type="checkbox"
                        id={"checkbox" + this._uniqueId}
                        className="cbx hidden"
                        checked={this.state.isSelected}
                        onChange={() => this.onChange()}
                        disabled={!!this.props.disabled}
                    />
                    <label htmlFor={"checkbox" + this._uniqueId} className={`lbl${this.props.disabled ? " disabled" : ""}`}></label>
                </div>
            </div>
        );
    }
}
