"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var models_1 = require("../models");
var comment_1 = require("../converter/factories/comment");
var CoveoCustomTag = (function () {
    function CoveoCustomTag(displayName, displayTemplate, rawName, rawValue) {
        this.displayName = displayName;
        this.displayTemplate = displayTemplate;
        this.rawName = rawName;
        this.rawValue = rawValue;
    }
    return CoveoCustomTag;
}());
exports.CoveoCustomTag = CoveoCustomTag;
var CoveoCustom = (function () {
    function CoveoCustom() {
    }
    CoveoCustom.parseBuildOptionArgs = function (buildOptionArgs) {
        var parsedBuildOptionArgs = {};
        var required = buildOptionArgs.match(/required\s*:\s([a-zA-Z]+)\s*/);
        if (required) {
            parsedBuildOptionArgs.required = new CoveoCustomTag("Required", function () { return "Specifying a value for this option is required for the component to work"; }, null, required[1]);
        }
        var depend = buildOptionArgs.match(/depend\s*:\s('[a-zA-Z]+'|"[a-zA-Z]+")\s*/);
        if (depend) {
            parsedBuildOptionArgs.depend = new CoveoCustomTag("Only effective when", function (rawValue, result) { return "[`" + rawValue + "`]{@link " + result.parent.parent.name + ".options." + rawValue + "} is set to `true`"; }, null, depend[1].replace(/(['"])([a-zA-Z]+)(['"])/, '$2'));
        }
        var min = buildOptionArgs.match(/min\s*:\s(\d+(\.\d+)?)\s*/);
        if (min) {
            parsedBuildOptionArgs.min = new CoveoCustomTag("Minimum", function (rawValue) { return "`" + rawValue + "`"; }, null, min[1]);
        }
        var max = buildOptionArgs.match(/max\s*:\s(\d+(\.\d+)?)\s*/);
        if (max) {
            parsedBuildOptionArgs.max = new CoveoCustomTag("Maximum", function (rawValue) { return "`" + rawValue + "`"; }, null, max[1]);
        }
        var float = buildOptionArgs.match(/float\s*:\s(true|false)\s/);
        if (float) {
            parsedBuildOptionArgs.float = new CoveoCustomTag("Accepts floating point values", function () { return ""; }, null, float[1]);
        }
        var defaultValue = buildOptionArgs.match(/defaultValue\s*:\s(-?\d+(\.\d+)?|true|false|'[^']*'|"[^"]*"|l\(('[^']*'|"[^"]*")\)|l\("[^"]*"\)|\[('[^']*',?\s*|"[^"]*",?\s*)*\])\s*/);
        if (defaultValue) {
            defaultValue[1] = defaultValue[1].replace('l(', '');
            defaultValue[1] = defaultValue[1].replace(')', '');
            defaultValue[1] = defaultValue[1].replace(')', '');
            defaultValue[1] = defaultValue[1].replace(/'/g, '');
            parsedBuildOptionArgs.defaultValue = new CoveoCustomTag("Default", function (rawValue) { return "`" + rawValue + "`"; }, null, defaultValue[1]);
        }
        return parsedBuildOptionArgs;
    };
    CoveoCustom.areResultAndCommentDefined = function (result, comment) {
        return result && comment !== null;
    };
    CoveoCustom.setNotSupportedInTag = function (converter, result, comment) {
        if (comment.indexOf('@notSupportedIn') !== -1) {
            var tagRegex = /@(?:notSupportedIn)\s*((?:[\w]+, )*[\w]+)/g;
            result.comment = comment_1.parseComment(comment.replace(tagRegex, ""));
            var tag = tagRegex.exec(comment);
            if (!result.comment.tags) {
                result.comment.tags = [];
            }
            var tagValue = tag[1];
            var tagValueInfo = converter.application.notSupportedFeaturesConfig[tagValue];
            if (tagValueInfo) {
                tagValue = "<a href=\"" + tagValueInfo.link + "\">" + tagValueInfo.name + "</a>";
            }
            result.comment.tags.push(new models_1.CommentTag('Not supported in', '', tagValue));
            result.notSupportedIn = tag[1].split(/,\s?/);
        }
    };
    CoveoCustom.extractOptionCustomMarkupExamples = function (result, comment) {
        if (comment.indexOf('@examples') != -1) {
            var examplesTagRegex = new RegExp(/@(?:examples)\s(.*)/);
            result.comment = comment_1.parseComment(comment.replace(examplesTagRegex, ''));
            var examplesTag = examplesTagRegex.exec(comment);
            if (!examplesTag || !examplesTag[1]) {
                return;
            }
            result.examples = examplesTag[1].split(/(?<!\\),/).map(function (s) { return s.trim().replace('\\,', ',').replace('\'', '&apos;'); });
        }
    };
    CoveoCustom.setCoveoComponentOptionsFlag = function (result, comment) {
        if (comment.indexOf("@componentOptions") !== -1) {
            result.setFlag(models_1.ReflectionFlag.CoveoComponentOptions, true);
        }
    };
    CoveoCustom.extractTagsFromComponentBuildOptionArgs = function (result) {
        if (result.parent && result.parent.comment && result.parent.comment.hasTag("componentoptions") && result.defaultValue) {
            result.coveoComponentOptionAttributes = CoveoCustom.parseBuildOptionArgs(result.defaultValue);
            for (var key in result.coveoComponentOptionAttributes) {
                if (!result.comment.tags) {
                    result.comment.tags = [];
                }
                var prop = result.coveoComponentOptionAttributes[key];
                result.comment.tags.push(new models_1.CommentTag(prop.displayName, '', prop.displayTemplate(prop.rawValue, result)));
            }
        }
    };
    CoveoCustom.parseAdditionalCustomTags = function (result) {
        if (!result.comment) {
            return;
        }
        if (!result.comment.tags) {
            result.comment.tags = [];
        }
        this.additionalCustomTags.forEach(function (customTag) {
            for (var i = 0; i < result.comment.tags.length; i++) {
                var tag = result.comment.tags[i];
                if (tag.tagName.toUpperCase() === customTag.rawName.toUpperCase()) {
                    result.comment.tags.splice(i, 1);
                    result.comment.tags.push(new models_1.CommentTag(customTag.displayName, "", customTag.displayTemplate(tag.text)));
                    if (!result.coveoAdditionalAttributes) {
                        result.coveoAdditionalAttributes = [];
                    }
                    result.coveoAdditionalAttributes.push(customTag);
                    break;
                }
            }
        });
    };
    CoveoCustom.additionalCustomTags = [
        new CoveoCustomTag("Available since", function (rawValue) { return "" + rawValue; }, "availablesince", null),
        new CoveoCustomTag("Deprecated since", function (rawValue) { return "" + rawValue; }, "deprecatedsince", null),
        new CoveoCustomTag("Result template component", function () { return "This component is intended to be used in [result templates](https://docs.coveo.com/en/413/)"; }, "isresulttemplatecomponent", null),
        new CoveoCustomTag("Additional documentation", function (rawValue) { return "" + rawValue; }, "externaldocs", null)
    ];
    return CoveoCustom;
}());
exports.CoveoCustom = CoveoCustom;
//# sourceMappingURL=coveoCustom.js.map