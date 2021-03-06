"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var index_1 = require("../../models/reflections/index");
var ReflectionGroup_1 = require("../../models/ReflectionGroup");
var components_1 = require("../components");
var converter_1 = require("../converter");
var camelCaseToHyphenRegex = /([A-Z])|\W+(\w)/g;
var GroupPlugin = (function (_super) {
    __extends(GroupPlugin, _super);
    function GroupPlugin() {
        _super.apply(this, arguments);
    }
    GroupPlugin.prototype.initialize = function () {
        this.listenTo(this.owner, (_a = {},
            _a[converter_1.Converter.EVENT_RESOLVE] = this.onResolve,
            _a[converter_1.Converter.EVENT_RESOLVE_END] = this.onEndResolve,
            _a
        ));
        var _a;
    };
    GroupPlugin.prototype.onResolve = function (context, reflection) {
        var reflection = reflection;
        reflection.kindString = GroupPlugin.getKindSingular(reflection.kind);
        if (reflection instanceof index_1.ContainerReflection) {
            var container = reflection;
            if (container.children && container.children.length > 0) {
                container.children.sort(GroupPlugin.sortCallback);
                container.groups = GroupPlugin.getReflectionGroups(container.children);
            }
        }
    };
    GroupPlugin.prototype.onEndResolve = function (context) {
        function walkDirectory(directory) {
            directory.groups = GroupPlugin.getReflectionGroups(directory.getAllReflections());
            for (var key in directory.directories) {
                if (!directory.directories.hasOwnProperty(key))
                    continue;
                walkDirectory(directory.directories[key]);
            }
        }
        var project = context.project;
        if (project.children && project.children.length > 0) {
            project.children.sort(GroupPlugin.sortCallback);
            project.groups = GroupPlugin.getReflectionGroups(project.children);
        }
        walkDirectory(project.directory);
        project.files.forEach(function (file) {
            file.groups = GroupPlugin.getReflectionGroups(file.reflections);
        });
    };
    GroupPlugin.getReflectionGroups = function (reflections) {
        var groups = [];
        reflections.forEach(function (child) {
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                if (group.kind != child.kind) {
                    continue;
                }
                group.children.push(child);
                return;
            }
            var group = new ReflectionGroup_1.ReflectionGroup(GroupPlugin.getKindPlural(child.kind), child.kind);
            if (child.flags.isCoveoComponentOptions) {
                group.title = 'Component Options';
            }
            group.children.push(child);
            if (group.title == 'Component Options') {
                if (group.children[0]['children']) {
                    group.children = group.children[0]['children'];
                    group.children.forEach(function (child) {
                        if (child.name) {
                            if (child['type']) {
                                var valuesExamples = GroupPlugin.getMarkupValueExampleFromType(child['type'].name, child);
                                child.markupExample = valuesExamples.map(function (example) {
                                    return "data-" + child.name.replace(camelCaseToHyphenRegex, '-$1$2').toLowerCase() + "='" + example + "'";
                                }).join('\n');
                                if (child.markupExample == '') {
                                    child.markupExample = null;
                                }
                            }
                        }
                        if (child.comment.hasTag('notsupportedin')) {
                            var tag = child.comment.getTag('notsupportedin');
                            tag.tagName = 'Not supported in';
                        }
                    });
                }
            }
            groups.push(group);
        });
        groups.forEach(function (group) {
            var someExported = false, allInherited = true, allPrivate = true, allProtected = true, allExternal = true;
            group.children.forEach(function (child) {
                someExported = child.flags.isExported || someExported;
                allPrivate = child.flags.isPrivate && allPrivate;
                allProtected = (child.flags.isPrivate || child.flags.isProtected) && allProtected;
                allExternal = child.flags.isExternal && allExternal;
                if (child instanceof index_1.DeclarationReflection) {
                    allInherited = child.inheritedFrom && allInherited;
                }
                else {
                    allInherited = false;
                }
            });
            group.someChildrenAreExported = someExported;
            group.allChildrenAreInherited = allInherited;
            group.allChildrenArePrivate = allPrivate;
            group.allChildrenAreProtectedOrPrivate = allProtected;
            group.allChildrenAreExternal = allExternal;
        });
        return groups;
    };
    GroupPlugin.getMarkupValueExampleFromType = function (name, ref) {
        var ret = [];
        if (ref && ref['type'] && ref['type'].constructor.name.toLowerCase() == 'uniontype') {
            ret = GroupPlugin.getMarkupValueExampleForUnionType(ref);
        }
        else if (name) {
            switch (name.toLowerCase()) {
                case 'boolean':
                    ret = ['true', 'false'];
                    break;
                case 'string':
                    ret = ['foo'];
                    break;
                case 'ifieldoption':
                    ret = ['@foo'];
                    break;
                case 'number':
                    ret = ['10'];
                    break;
                case 'array':
                    if (ref['type'] && ref['type'].typeArguments && ref['type'].typeArguments[0]) {
                        ret = GroupPlugin.getMarkupValueExampleFromType(ref['type'].typeArguments[0].name, ref);
                        ret = ret.map(function (example) {
                            return example + "," + example + "2";
                        });
                    }
                    break;
            }
        }
        return ret;
    };
    GroupPlugin.getKindString = function (kind) {
        var str = index_1.ReflectionKind[kind];
        str = str.replace(/(.)([A-Z])/g, function (m, a, b) { return a + ' ' + b.toLowerCase(); });
        return str;
    };
    GroupPlugin.getKindSingular = function (kind) {
        if (GroupPlugin.SINGULARS[kind]) {
            return GroupPlugin.SINGULARS[kind];
        }
        else {
            return GroupPlugin.getKindString(kind);
        }
    };
    GroupPlugin.getKindPlural = function (kind) {
        if (GroupPlugin.PLURALS[kind]) {
            return GroupPlugin.PLURALS[kind];
        }
        else {
            return this.getKindString(kind) + 's';
        }
    };
    GroupPlugin.sortCallback = function (a, b) {
        var aWeight = GroupPlugin.WEIGHTS.indexOf(a.kind);
        var bWeight = GroupPlugin.WEIGHTS.indexOf(b.kind);
        if (a.flags.isCoveoComponentOptions && b.kind > index_1.ReflectionKind.Class) {
            return -1;
        }
        else if (b.flags.isCoveoComponentOptions && a.kind > index_1.ReflectionKind.Class) {
            return 1;
        }
        if (aWeight == bWeight) {
            if (a.flags.isStatic && !b.flags.isStatic)
                return 1;
            if (!a.flags.isStatic && b.flags.isStatic)
                return -1;
            if (a.name == b.name)
                return 0;
            return a.name > b.name ? 1 : -1;
        }
        else
            return aWeight - bWeight;
    };
    GroupPlugin.WEIGHTS = [
        index_1.ReflectionKind.Global,
        index_1.ReflectionKind.ExternalModule,
        index_1.ReflectionKind.Module,
        index_1.ReflectionKind.Enum,
        index_1.ReflectionKind.EnumMember,
        index_1.ReflectionKind.Class,
        index_1.ReflectionKind.Interface,
        index_1.ReflectionKind.TypeAlias,
        index_1.ReflectionKind.Method,
        index_1.ReflectionKind.Event,
        index_1.ReflectionKind.Property,
        index_1.ReflectionKind.Variable,
        index_1.ReflectionKind.Function,
        index_1.ReflectionKind.Accessor,
        index_1.ReflectionKind.ObjectLiteral,
        index_1.ReflectionKind.Constructor,
        index_1.ReflectionKind.Parameter,
        index_1.ReflectionKind.TypeParameter,
        index_1.ReflectionKind.TypeLiteral,
        index_1.ReflectionKind.CallSignature,
        index_1.ReflectionKind.ConstructorSignature,
        index_1.ReflectionKind.IndexSignature,
        index_1.ReflectionKind.GetSignature,
        index_1.ReflectionKind.SetSignature,
    ];
    GroupPlugin.SINGULARS = (function () {
        var singulars = {};
        singulars[index_1.ReflectionKind.Enum] = 'Enumeration';
        singulars[index_1.ReflectionKind.EnumMember] = 'Enumeration member';
        return singulars;
    })();
    GroupPlugin.PLURALS = (function () {
        var plurals = {};
        plurals[index_1.ReflectionKind.Class] = 'Classes';
        plurals[index_1.ReflectionKind.Property] = 'Properties';
        plurals[index_1.ReflectionKind.Enum] = 'Enumerations';
        plurals[index_1.ReflectionKind.EnumMember] = 'Enumeration members';
        plurals[index_1.ReflectionKind.TypeAlias] = 'Type aliases';
        return plurals;
    })();
    GroupPlugin.getMarkupValueExampleForUnionType = function (ref) {
        var ret = [];
        if (ref && ref.type && ref.type.types[0] && ref.type.types[0].typeArguments && ref.type.types[0].typeArguments[0]) {
            if (ref.type.types[0].typeArguments[0].constructor.name.toLowerCase() == 'uniontype') {
                ret = ref.type.types[0].typeArguments[0].types.map(function (type) {
                    return type.value;
                });
                if (ref.type.types[0].name && ref.type.types[0].name.toLowerCase() == 'array') {
                    var copy = [];
                    for (var i = 0; i < ret.length; i++) {
                        copy[i] = ret.slice(0, i + 1).join(',');
                    }
                    ret = copy;
                }
                ret = ret.slice(0, 4);
            }
            else {
                ret = GroupPlugin.getMarkupValueExampleFromType(ref.type.types[0].typeArguments[0].name, undefined);
            }
        }
        return ret;
    };
    GroupPlugin = __decorate([
        components_1.Component({ name: 'group' })
    ], GroupPlugin);
    return GroupPlugin;
}(components_1.ConverterComponent));
exports.GroupPlugin = GroupPlugin;
