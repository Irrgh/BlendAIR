import { Resizable } from "./Resizable";
import { ResizableWindow } from "./ResizableWindow";

/**
 * A window where actual content is display instead of a structural Window like {@link ResizableWindow} (@todo rename).
 * In the future a {@link StructureWindow}'s children are going to be ` StructureWindow[] | ContentWindow`.
 * the (nonexistent) split() function on a Content Window is going to clone replace ContentWindow with two StructureWindows containing
 * a clone of the original Window downsized. etc
 */
export abstract class ContentWindow implements Resizable{



    protected parent? : ResizableWindow;

    protected headerElement : HTMLDivElement;

    protected contentElement: HTMLElement;

    constructor (content:HTMLElement) {
        this.headerElement = document.createElement("div");
        this.headerElement.style.height = `50px`
        this.headerElement.style.width = `100%`;
        this.headerElement.style.color = `red`;
        this.contentElement = content;
    }

    abstract resize(width: number, height: number): void;

    public setParent (parent:ResizableWindow) {
        this.parent = parent;
        const div = this.parent?.getDiv();

        div.append(this.headerElement);
        div.append(this.contentElement);
        this.resize(parent.width,parent.height);
    }


}