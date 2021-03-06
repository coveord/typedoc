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
var Path = require("path");
var FS = require("fs");
var theme_1 = require("../theme");
var index_1 = require("../../models/reflections/index");
var UrlMapping_1 = require("../models/UrlMapping");
var NavigationItem_1 = require("../models/NavigationItem");
var events_1 = require("../events");
var component_1 = require("../../utils/component");
var declaration_1 = require("../../utils/options/declaration");
var DefaultTheme = (function (_super) {
    __extends(DefaultTheme, _super);
    function DefaultTheme(renderer, basePath) {
        _super.call(this, renderer, basePath);
        this.listenTo(renderer, events_1.RendererEvent.BEGIN, this.onRendererBegin, 1024);
    }
    DefaultTheme.prototype.isOutputDirectory = function (path) {
        if (!FS.existsSync(Path.join(path, 'index.html')))
            return false;
        if (!FS.existsSync(Path.join(path, 'assets')))
            return false;
        if (!FS.existsSync(Path.join(path, 'assets', 'js', 'main.js')))
            return false;
        if (!FS.existsSync(Path.join(path, 'assets', 'images', 'icons.png')))
            return false;
        return true;
    };
    DefaultTheme.prototype.getUrls = function (project) {
        var urls = [];
        var entryPoint = this.getEntryPoint(project);
        if (this.application.options.getValue('readme') == 'none') {
            entryPoint.url = 'index.html';
            urls.push(new UrlMapping_1.UrlMapping('index.html', entryPoint, 'reflection.hbs'));
        }
        else {
            entryPoint.url = 'globals.html';
            urls.push(new UrlMapping_1.UrlMapping('globals.html', entryPoint, 'reflection.hbs'));
            urls.push(new UrlMapping_1.UrlMapping('index.html', project, 'index.hbs'));
        }
        if (entryPoint.children) {
            entryPoint.children.forEach(function (child) {
                if (child instanceof index_1.DeclarationReflection) {
                    DefaultTheme.buildUrls(child, urls);
                }
            });
        }
        return urls;
    };
    DefaultTheme.prototype.getEntryPoint = function (project) {
        var entryPoint = this.entryPoint;
        if (entryPoint) {
            var reflection = project.getChildByName(entryPoint);
            if (reflection) {
                if (reflection instanceof index_1.ContainerReflection) {
                    return reflection;
                }
                else {
                    this.application.logger.warn('The given entry point `%s` is not a container.', entryPoint);
                }
            }
            else {
                this.application.logger.warn('The entry point `%s` could not be found.', entryPoint);
            }
        }
        return project;
    };
    DefaultTheme.prototype.getNavigation = function (project) {
        function containsExternals(modules) {
            for (var index = 0, length = modules.length; index < length; index++) {
                if (modules[index].flags.isExternal)
                    return true;
            }
            return false;
        }
        function sortReflections(modules) {
            modules.sort(function (a, b) {
                if (a.flags.isExternal && !b.flags.isExternal)
                    return 1;
                if (!a.flags.isExternal && b.flags.isExternal)
                    return -1;
                return a.getFullName() < b.getFullName() ? -1 : 1;
            });
        }
        function includeDedicatedUrls(reflection, item) {
            (function walk(reflection) {
                for (var key in reflection.children) {
                    var child = reflection.children[key];
                    if (child.hasOwnDocument && !child.kindOf(index_1.ReflectionKind.SomeModule)) {
                        if (!item.dedicatedUrls)
                            item.dedicatedUrls = [];
                        item.dedicatedUrls.push(child.url);
                        walk(child);
                    }
                }
            })(reflection);
        }
        function buildChildren(reflection, parent) {
            var modules = reflection.getChildrenByKind(index_1.ReflectionKind.SomeModule);
            modules.sort(function (a, b) {
                return a.getFullName() < b.getFullName() ? -1 : 1;
            });
            modules.forEach(function (reflection) {
                var item = NavigationItem_1.NavigationItem.create(reflection, parent);
                includeDedicatedUrls(reflection, item);
                buildChildren(reflection, item);
            });
        }
        function buildGroups(reflections, parent, callback) {
            var state = -1;
            var hasExternals = containsExternals(reflections);
            sortReflections(reflections);
            reflections.forEach(function (reflection) {
                if (hasExternals && !reflection.flags.isExternal && state != 1) {
                    new NavigationItem_1.NavigationItem('Internals', null, parent, "tsd-is-external");
                    state = 1;
                }
                else if (hasExternals && reflection.flags.isExternal && state != 2) {
                    new NavigationItem_1.NavigationItem('Externals', null, parent, "tsd-is-external");
                    state = 2;
                }
                var item = NavigationItem_1.NavigationItem.create(reflection, parent);
                includeDedicatedUrls(reflection, item);
                if (callback)
                    callback(reflection, item);
            });
        }
        function build(hasSeparateGlobals) {
            var root = new NavigationItem_1.NavigationItem('Index', 'index.html');
            if (entryPoint == project) {
                var globals = new NavigationItem_1.NavigationItem('Globals', hasSeparateGlobals ? 'globals.html' : 'index.html', root);
                globals.isGlobals = true;
            }
            var modules = [];
            project.getReflectionsByKind(index_1.ReflectionKind.SomeModule).forEach(function (someModule) {
                var target = someModule.parent;
                var inScope = (someModule == entryPoint);
                while (target) {
                    if (target.kindOf(index_1.ReflectionKind.ExternalModule))
                        return;
                    if (entryPoint == target)
                        inScope = true;
                    target = target.parent;
                }
                if (inScope && someModule instanceof index_1.DeclarationReflection) {
                    modules.push(someModule);
                }
            });
            if (modules.length < 10) {
                buildGroups(modules, root);
            }
            else {
                buildGroups(entryPoint.getChildrenByKind(index_1.ReflectionKind.SomeModule), root, buildChildren);
            }
            return root;
        }
        var entryPoint = this.getEntryPoint(project);
        return build(this.application.options.getValue('readme') != 'none');
    };
    DefaultTheme.prototype.onRendererBegin = function (event) {
        if (event.project.groups) {
            event.project.groups.forEach(DefaultTheme.applyGroupClasses);
        }
        for (var id in event.project.reflections) {
            var reflection = event.project.reflections[id];
            if (reflection instanceof index_1.DeclarationReflection) {
                DefaultTheme.applyReflectionClasses(reflection);
            }
            if (reflection instanceof index_1.ContainerReflection && reflection['groups']) {
                reflection['groups'].forEach(DefaultTheme.applyGroupClasses);
            }
        }
    };
    DefaultTheme.getUrl = function (reflection, relative, separator) {
        if (separator === void 0) { separator = '.'; }
        var url = reflection.getAlias();
        if (reflection.parent && reflection.parent != relative &&
            !(reflection.parent instanceof index_1.ProjectReflection))
            url = DefaultTheme.getUrl(reflection.parent, relative, separator) + separator + url;
        return url;
    };
    DefaultTheme.getMapping = function (reflection) {
        for (var i = 0, c = DefaultTheme.MAPPINGS.length; i < c; i++) {
            var mapping = DefaultTheme.MAPPINGS[i];
            if (reflection.kindOf(mapping.kind)) {
                return mapping;
            }
        }
        return null;
    };
    DefaultTheme.buildUrls = function (reflection, urls) {
        var mapping = DefaultTheme.getMapping(reflection);
        if (mapping) {
            var url = [mapping.directory, DefaultTheme.getUrl(reflection) + '.html'].join('/');
            urls.push(new UrlMapping_1.UrlMapping(url, reflection, mapping.template));
            reflection.url = url;
            reflection.hasOwnDocument = true;
            for (var key in reflection.children) {
                var child = reflection.children[key];
                if (mapping.isLeaf) {
                    DefaultTheme.applyAnchorUrl(child, reflection);
                }
                else {
                    DefaultTheme.buildUrls(child, urls);
                }
            }
        }
        else {
            DefaultTheme.applyAnchorUrl(reflection, reflection.parent);
        }
        return urls;
    };
    DefaultTheme.applyAnchorUrl = function (reflection, container) {
        var anchor = DefaultTheme.getUrl(reflection, container, '.');
        if (reflection['isStatic']) {
            anchor = 'static-' + anchor;
        }
        reflection.url = container.url + '#' + anchor;
        reflection.anchor = anchor;
        reflection.hasOwnDocument = false;
        reflection.traverse(function (child) {
            if (child instanceof index_1.DeclarationReflection) {
                DefaultTheme.applyAnchorUrl(child, container);
            }
        });
    };
    DefaultTheme.applyReflectionClasses = function (reflection) {
        var classes = [];
        if (reflection.kind == index_1.ReflectionKind.CoveoComponent) {
            classes.push('tsd-kind-class');
        }
        if (reflection.kind == index_1.ReflectionKind.Accessor) {
            if (!reflection.getSignature) {
                classes.push('tsd-kind-set-signature');
            }
            else if (!reflection.setSignature) {
                classes.push('tsd-kind-get-signature');
            }
            else {
                classes.push('tsd-kind-accessor');
            }
        }
        else {
            var kind = index_1.ReflectionKind[reflection.kind];
            classes.push(DefaultTheme.toStyleClass('tsd-kind-' + kind));
        }
        if (reflection.parent && reflection.parent instanceof index_1.DeclarationReflection) {
            kind = index_1.ReflectionKind[reflection.parent.kind];
            classes.push(DefaultTheme.toStyleClass('tsd-parent-kind-' + kind));
            if (index_1.ReflectionKind[kind] == index_1.ReflectionKind.CoveoComponent) {
                classes.push(DefaultTheme.toStyleClass('tsd-parent-kind-' + index_1.ReflectionKind[index_1.ReflectionKind.Class]));
            }
        }
        var hasTypeParameters = !!reflection.typeParameters;
        reflection.getAllSignatures().forEach(function (signature) {
            hasTypeParameters = hasTypeParameters || !!signature.typeParameters;
        });
        if (hasTypeParameters)
            classes.push('tsd-has-type-parameter');
        if (reflection.overwrites)
            classes.push('tsd-is-overwrite');
        if (reflection.inheritedFrom)
            classes.push('tsd-is-inherited');
        if (reflection.flags.isPrivate)
            classes.push('tsd-is-private');
        if (reflection.flags.isProtected)
            classes.push('tsd-is-protected');
        if (reflection.flags.isStatic)
            classes.push('tsd-is-static');
        if (reflection.flags.isExternal)
            classes.push('tsd-is-external');
        if (!reflection.flags.isExported)
            classes.push('tsd-is-not-exported');
        reflection.cssClasses = classes.join(' ');
    };
    DefaultTheme.applyGroupClasses = function (group) {
        var classes = [];
        if (group.allChildrenAreInherited)
            classes.push('tsd-is-inherited');
        if (group.allChildrenArePrivate)
            classes.push('tsd-is-private');
        if (group.allChildrenAreProtectedOrPrivate)
            classes.push('tsd-is-private-protected');
        if (group.allChildrenAreExternal)
            classes.push('tsd-is-external');
        if (!group.someChildrenAreExported)
            classes.push('tsd-is-not-exported');
        group.cssClasses = classes.join(' ');
    };
    DefaultTheme.toStyleClass = function (str) {
        return str.replace(/(\w)([A-Z])/g, function (m, m1, m2) { return m1 + '-' + m2; }).toLowerCase();
    };
    DefaultTheme.MAPPINGS = [{
            kind: [index_1.ReflectionKind.Class],
            isLeaf: false,
            directory: 'classes',
            template: 'reflection.hbs'
        }, {
            kind: [index_1.ReflectionKind.Interface],
            isLeaf: false,
            directory: 'interfaces',
            template: 'reflection.hbs'
        }, {
            kind: [index_1.ReflectionKind.Enum],
            isLeaf: false,
            directory: 'enums',
            template: 'reflection.hbs'
        }, {
            kind: [index_1.ReflectionKind.Module, index_1.ReflectionKind.ExternalModule],
            isLeaf: false,
            directory: 'modules',
            template: 'reflection.hbs'
        }, {
            kind: [index_1.ReflectionKind.CoveoComponent],
            isLeaf: false,
            directory: 'components',
            template: 'reflection.hbs'
        }];
    __decorate([
        component_1.Option({
            name: 'gaID',
            help: 'Set the Google Analytics tracking ID and activate tracking code.'
        })
    ], DefaultTheme.prototype, "gaID", void 0);
    __decorate([
        component_1.Option({
            name: 'gaSite',
            help: 'Set the site name for Google Analytics. Defaults to `auto`.',
            defaultValue: 'auto'
        })
    ], DefaultTheme.prototype, "gaSite", void 0);
    __decorate([
        component_1.Option({
            name: 'hideGenerator',
            help: 'Do not print the TypeDoc link at the end of the page.',
            type: declaration_1.ParameterType.Boolean
        })
    ], DefaultTheme.prototype, "hideGenerator", void 0);
    __decorate([
        component_1.Option({
            name: 'entryPoint',
            help: 'Specifies the fully qualified name of the root symbol. Defaults to global namespace.',
            type: declaration_1.ParameterType.String
        })
    ], DefaultTheme.prototype, "entryPoint", void 0);
    return DefaultTheme;
}(theme_1.Theme));
exports.DefaultTheme = DefaultTheme;
