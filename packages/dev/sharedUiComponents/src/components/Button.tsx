import type { PropsWithChildren } from "react";
import * as styles from "./Button.module.scss";
import { ClassNames } from "./classNames";

export type ButtonProps = {
    disabled?: boolean;
    active?: boolean;
    onClick?: () => void;
    color: "light" | "dark";
    size: "default" | "small" | "wide" | "smaller";
    title?: string;
    backgroundColor?: string;
};

export const Button: React.FC<PropsWithChildren<ButtonProps>> = ({ disabled, active, onClick, children, color, size, title, backgroundColor }) => {
    return (
        <button
            className={ClassNames(
                { button: true, active, wide: size === "wide", small: size === "small", smaller: size === "smaller", light: color === "light", dark: color === "dark" },
                styles
            )}
            disabled={disabled}
            onClick={onClick}
            title={title}
            style={{ backgroundColor }}
        >
            {children}
        </button>
    );
};
