export enum ControlType {
    TITLE,
    SPACER,
    TEXT,
    PASSWORD,
    EMAIL,
    RADIO,
    CHECKBOX,
    COLOR,
    FILE
}

export interface Control {
    selector: string;
    type: ControlType;
    placeholder?: string;
    value?: any;
    state?: ValidityState;
    valid?: boolean;
    required?: boolean;
    options?: { value: string | number, label: string }[];
    defaultValue?: any;
    canClear?: boolean;
    label?: string;
}

export interface MyForm {
    controls: Control[];
    valid?: boolean;
    value?: { [key: string]: any };
    lastControlChanged?: string;
}