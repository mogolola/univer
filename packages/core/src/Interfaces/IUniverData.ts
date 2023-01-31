import { LocaleType } from '../Enum';

export interface IUniverData {
    locale: LocaleType;
}

/**
 * ToolBar Observer generic interface, convenient for plug-ins to define their own types
 */
export interface ToolBarObserver<T = string> {
    /**
     * fontSize, fontFamily,color...
     */
    name: string;

    /**
     * fontSize:number, fontFamily:string ...
     */
    value?: T;
}
