import type { CheckboxOnChangeData } from "@fluentui/react-components";
import type { ChangeEvent, FunctionComponent } from "react";

import { Checkbox as FluentCheckbox } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { PrimitiveProps } from "./primitive";

/**
 * This is a primitive fluent checkbox that can both read and write checked state
 * @param props
 * @returns Checkbox component
 */
export const Checkbox: FunctionComponent<PrimitiveProps<boolean>> = (props) => {
    const [checked, setChecked] = useState(() => props.value ?? false);

    useEffect(() => {
        if (props.value != undefined) {
            setChecked(props.value); // Update local state when props.checked changes
        }
    }, [props.value]);

    const onChange = (ev: ChangeEvent<HTMLInputElement>, _: CheckboxOnChangeData) => {
        props.onChange(ev.target.checked);
        setChecked(ev.target.checked);
    };

    return <FluentCheckbox checked={checked} onChange={onChange} disabled={props.disabled} />;
};
