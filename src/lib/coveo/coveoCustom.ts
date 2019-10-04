import { Reflection, ReflectionFlag, CommentTag } from "../models";
import { parseComment } from "../converter/factories/comment";
import { Converter } from "../converter";

export interface ICoveoDisplayTemplateFunction {
  (rawValue?: string, result?: Reflection): string;
}

export class CoveoCustomTag {
  public displayName: string;
  public displayTemplate: ICoveoDisplayTemplateFunction;
  public rawName?: string;
  public rawValue?: string;

  constructor(displayName: string, displayTemplate: ICoveoDisplayTemplateFunction, rawName?: string, rawValue?: string) {
    this.displayName = displayName;
    this.displayTemplate = displayTemplate;
    this.rawName = rawName;
    this.rawValue = rawValue;
  }
}

export interface IParsedCoveoBuildOptionArgs {
  required?: CoveoCustomTag,
  defaultValue?: CoveoCustomTag,
  depend?: CoveoCustomTag,
  min?: CoveoCustomTag,
  max?: CoveoCustomTag,
  float?: CoveoCustomTag
}

export class CoveoCustom {
  static parseBuildOptionArgs(buildOptionArgs: string): IParsedCoveoBuildOptionArgs {
    let parsedBuildOptionArgs: IParsedCoveoBuildOptionArgs = {};

    const required = buildOptionArgs.match(/required\s*:\s([a-zA-Z]+)\s*/);
    if (required) {
        parsedBuildOptionArgs.required = new CoveoCustomTag(
          "Required",
          () => { return "Specifying a value for this option is required for the component to work"; },
          null,
          required[1]);
    }

    let depend = buildOptionArgs.match(/depend\s*:\s('[a-zA-Z]+'|"[a-zA-Z]+")\s*/);
    if (depend) {
        parsedBuildOptionArgs.depend = new CoveoCustomTag(
          "Only effective when",
          (rawValue, result) => {return `[\`${rawValue}\`]{@link ${result.parent.parent.name}.options.${rawValue}} is set to \`true\``;},
          null,
          depend[1].replace(/(['"])([a-zA-Z]+)(['"])/, '$2'));
    }

    const min = buildOptionArgs.match(/min\s*:\s(\d+(\.\d+)?)\s*/);
    if (min) {
        parsedBuildOptionArgs.min = new CoveoCustomTag(
          "Minimum",
          (rawValue) => { return `\`${rawValue}\``; },
          null,
          min[1]);
    }

    const max = buildOptionArgs.match(/max\s*:\s(\d+(\.\d+)?)\s*/);
    if (max) {
        parsedBuildOptionArgs.max = new CoveoCustomTag(
          "Maximum",
          (rawValue) => { return `\`${rawValue}\``; },
          null,
          max[1]);
    }

    const float = buildOptionArgs.match(/float\s*:\s(true|false)\s/);
    if (float) {
        parsedBuildOptionArgs.float = new CoveoCustomTag(
          "Accepts floating point values",
          () => { return ""; },
          null,
          float[1]);
    }

    let defaultValue = buildOptionArgs.match(/defaultValue\s*:\s(-?\d+(\.\d+)?|true|false|'[^']*'|"[^"]*"|l\(('[^']*'|"[^"]*")\)|l\("[^"]*"\)|\[('[^']*',?\s*|"[^"]*",?\s*)*\])\s*/);
    if (defaultValue) {
        defaultValue[1] = defaultValue[1].replace('l(', '');
        defaultValue[1] = defaultValue[1].replace(')', '');
        defaultValue[1] = defaultValue[1].replace(')', '');
        defaultValue[1] = defaultValue[1].replace(/'/g, '');
        parsedBuildOptionArgs.defaultValue = new CoveoCustomTag(
          "Default",
          (rawValue) => { return `\`${rawValue}\``; },
          null,
          defaultValue[1]);
    }

    return parsedBuildOptionArgs;
  }

  static areResultAndCommentDefined(result: Reflection, comment: string|null) {
    return result && comment !== null;
  }

  static setNotSupportedInTag(converter: Converter, result: Reflection, comment: string) {
    if (comment.indexOf('@notSupportedIn') !== -1) {
      const tagRegex = /@(?:notSupportedIn)\s*((?:[\w]+, )*[\w]+)/g;

      result.comment = parseComment(comment.replace(tagRegex, ""));

      const tag = tagRegex.exec(comment);

      if (!result.comment.tags) {
          result.comment.tags = [];
      }

      let tagValue = tag[1];
      const tagValueInfo = converter.application.notSupportedFeaturesConfig[tagValue];
      if (tagValueInfo) {
          tagValue = `<a href="${tagValueInfo.link}">${tagValueInfo.name}</a>`
      }
      result.comment.tags.push(new CommentTag('Not supported in', '', tagValue));
      result.notSupportedIn = tag[1].split(/,\s?/);
    }
  }


  static extractOptionCustomMarkupExamples(result: Reflection, comment: string) {
    if (comment.indexOf('@examples') != -1) {
      const examplesTagRegex = new RegExp(/@(?:examples)\s(.*)/);

      result.comment = parseComment(comment.replace(examplesTagRegex, ''));

      const examplesTag = examplesTagRegex.exec(comment);
      if (!examplesTag || !examplesTag[1]) {
          return;
      }

      result.examples = examplesTag[1].split(/(?<!\\),/).map(s => s.trim().replace('\\,', ',').replace('\'', '&apos;'));
    }
  }

  static setCoveoComponentOptionsFlag(result: Reflection, comment: string) {
    if (comment.indexOf("@componentOptions") !== -1) {
      result.setFlag(ReflectionFlag.CoveoComponentOptions, true);
    }
  }

  static extractTagsFromComponentBuildOptionArgs(result: Reflection) {
    if (result.parent && result.parent.comment && result.parent.comment.hasTag("componentoptions") && result.defaultValue) {
      result.coveoComponentOptionAttributes = CoveoCustom.parseBuildOptionArgs(result.defaultValue)
      for (let key in result.coveoComponentOptionAttributes) {
          if (!result.comment.tags) {
              result.comment.tags = [];
          }
          const prop = result.coveoComponentOptionAttributes[key] as CoveoCustomTag;
          result.comment.tags.push(new CommentTag(
            prop.displayName,
            '',
            prop.displayTemplate(prop.rawValue, result)));
      }
    }
  }

  static additionalCustomTags: CoveoCustomTag[] = [
    new CoveoCustomTag(
      "Available since",
      (rawValue) => { return `${rawValue}`; },
      "availablesince",
      null),
    new CoveoCustomTag(
      "Deprecated since",
      (rawValue) => { return `${rawValue}`; },
      "deprecatedsince",
      null),
    new CoveoCustomTag(
      "Result template component",
      () => { return "This component is intended to be used in [result templates](https://docs.coveo.com/en/413/)"; },
      "isresulttemplatecomponent",
      null),
    new CoveoCustomTag(
      "Additional documentation",
      (rawValue) => { return `${rawValue}`; },
      "externaldocs",
      null)
  ]

  static parseAdditionalCustomTags(result: Reflection) {
    if (!result.comment) {
      return;
    }
    if (!result.comment.tags) {
      result.comment.tags = [];
    }
    this.additionalCustomTags.forEach((customTag) => {
      for (let i = 0; i < result.comment.tags.length; i++) {
        const tag = result.comment.tags[i];
        if (tag.tagName.toUpperCase() === customTag.rawName.toUpperCase()) {
          /* Removing the tag and pushing a new one ensures that the custom
             tags will always get rendered in the desired order (i.e., in the
             order they appear in the additionalCustomTags array). */
          result.comment.tags.splice(i, 1);
          result.comment.tags.push(new CommentTag(
            customTag.displayName,
            "",
            customTag.displayTemplate(tag.text)));
          if (!result.coveoAdditionalAttributes) {
            result.coveoAdditionalAttributes = [];
          }
          result.coveoAdditionalAttributes.push(customTag);
          break;
        }
      }
    })
  }
}
