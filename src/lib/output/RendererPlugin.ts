import * as Path from "path";

import {Renderer} from "./Renderer";
import {ProjectReflection, DeclarationReflection} from "../models/reflections/index";
import {OutputEvent} from "./events/OutputEvent";
import {OutputPageEvent} from "./events/OutputPageEvent";
import {RendererComponent} from "../utils/component";


/**
 * A plugin for the renderer that reads the current render context.
 */
export abstract class ContextAwareRendererPlugin extends RendererComponent
{
    /**
     * The project that is currently processed.
     */
    protected project:ProjectReflection;

    /**
     * The reflection that is currently processed.
     */
    protected reflection:DeclarationReflection;

    /**
     * The url of the document that is being currently generated.
     */
    private location:string;



    /**
     * Create a new ContextAwareRendererPlugin instance.
     *
     * @param renderer  The renderer this plugin should be attached to.
     */
    constructor(renderer:Renderer) {
        super(renderer);
        renderer.on(Renderer.EVENT_BEGIN, this.onRendererBegin, this);
        renderer.on(Renderer.EVENT_BEGIN_PAGE, this.onRendererBeginPage, this);
    }


    /**
     * Transform the given absolute path into a relative path.
     *
     * @param absolute  The absolute path to transform.
     * @returns A path relative to the document currently processed.
     */
    public getRelativeUrl(absolute:string):string {
        var relative = Path.relative(Path.dirname(this.location), Path.dirname(absolute));
        return Path.join(relative, Path.basename(absolute)).replace(/\\/g, '/');
    }


    /**
     * Triggered before the renderer starts rendering a project.
     *
     * @param event  An event object describing the current render operation.
     */
    protected onRendererBegin(event:OutputEvent) {
        this.project = event.project;
    }


    /**
     * Triggered before a document will be rendered.
     *
     * @param page  An event object describing the current render operation.
     */
    protected onRendererBeginPage(page:OutputPageEvent) {
        this.location   = page.url;
        this.reflection = page.model instanceof DeclarationReflection ? page.model : null;
    }
}