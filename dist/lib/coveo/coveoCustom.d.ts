import { Reflection } from "../models";
import { Converter } from "../converter";
export interface ICoveoDisplayTemplateFunction {
    (rawValue?: string, result?: Reflection): string;
}
export declare class CoveoCustomTag {
    displayName: string;
    displayTemplate: ICoveoDisplayTemplateFunction;
    rawName?: string;
    rawValue?: string;
    constructor(displayName: string, displayTemplate: ICoveoDisplayTemplateFunction, rawName?: string, rawValue?: string);
}
export interface IParsedCoveoBuildOptionArgs {
    required?: CoveoCustomTag;
    defaultValue?: CoveoCustomTag;
    depend?: CoveoCustomTag;
    min?: CoveoCustomTag;
    max?: CoveoCustomTag;
    float?: CoveoCustomTag;
}
export declare class CoveoCustom {
    static parseBuildOptionArgs(buildOptionArgs: string): IParsedCoveoBuildOptionArgs;
    static areResultAndCommentDefined(result: Reflection, comment: string | null): boolean;
    static setNotSupportedInTag(converter: Converter, result: Reflection, comment: string): void;
    static extractOptionCustomMarkupExamples(result: Reflection, comment: string): void;
    static setCoveoComponentOptionsFlag(result: Reflection, comment: string): void;
    static extractTagsFromComponentBuildOptionArgs(result: Reflection): void;
    static additionalCustomTags: CoveoCustomTag[];
    static parseAdditionalCustomTags(result: Reflection): void;
}
