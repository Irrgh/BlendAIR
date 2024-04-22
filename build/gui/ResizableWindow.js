export var ResizableLayout;
(function (ResizableLayout) {
    ResizableLayout[ResizableLayout["VERTICAL"] = 0] = "VERTICAL";
    ResizableLayout[ResizableLayout["HORIZONTAL"] = 1] = "HORIZONTAL";
})(ResizableLayout || (ResizableLayout = {}));
export var ResizableType;
(function (ResizableType) {
    ResizableType[ResizableType["ROOT"] = 0] = "ROOT";
    ResizableType[ResizableType["BRANCH"] = 1] = "BRANCH";
    ResizableType[ResizableType["CHILD"] = 2] = "CHILD";
})(ResizableType || (ResizableType = {}));
export class ResizableWindow {
    //public static rootDiv: HTMLDivElement;
    //** In pixel */
    static MINIMUM_DIMENSIONS = 50;
    static RESIZER_THICKNESS = 4;
    activeResizer = null;
    constructor(parentWindow, childLayout, type = ResizableType.CHILD) {
        this.parent = parentWindow;
        this.div = document.createElement("div");
        //if (this.parent) {                            not needed since all div insertion happens in insertBefore or insertAfter();
        //    this.parent.div.appendChild(this.div);
        //}
        this.childLayout = childLayout;
        this.type = type;
        if (this.type === ResizableType.ROOT) {
            this.div.classList.add("app-window-root");
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.div.style.setProperty("width", `${this.width}`);
            this.div.style.setProperty("height", `${this.height}`);
        }
        else {
            this.div.classList.add("app-window");
            this.width = ResizableWindow.MINIMUM_DIMENSIONS;
            this.height = ResizableWindow.MINIMUM_DIMENSIONS;
        }
        this.children = [];
        this.resizers = [];
    }
    parent;
    children;
    resizers;
    div;
    childLayout;
    type;
    width;
    height;
    /**
     * Creates a Root window for the app.
     * Should only be called once per tab.
     * @returns the root window of the app.
     */
    static initializeRootWindow(childLayout) {
        const window = new ResizableWindow(null, childLayout, ResizableType.ROOT);
        document.body.appendChild(window.div);
        return window;
    }
    /**
     * Inserts a child at the specified position.
     * Blender equivalent is drag right !
     * @param child child to be inserted.
     * @param index of the element to be prepended.
     */
    insertChildBefore(child, index) {
        this.type = ResizableType.BRANCH;
        if (this.children.length == 0) { // setup of first child;
            return this.setInitialChild(child);
        }
        const childrenBefore = this.children.slice(0, index); // insert child into list of children
        const childrenAfter = this.children.slice(index);
        this.children = childrenBefore.concat([child], childrenAfter);
        const childArray = this.children.map((child) => { return child.div; });
        const divBefore = childArray[index]; // this probably needs some fix
        if (divBefore) {
            this.div.insertBefore(child.div, divBefore); // probably not needed
        }
        else {
            this.div.appendChild(child.div);
        }
        const resizer = document.createElement("div");
        if (this.childLayout === ResizableLayout.HORIZONTAL) {
            child.div.style.setProperty("width", `${child.width}px`);
            child.div.style.setProperty("height", `${this.height}px`);
            child.div.style.setProperty("left", `${divBefore.clientLeft}px`);
            child.div.style.setProperty("top", `${this.div.clientTop}px`);
            divBefore.style.setProperty("left", `${divBefore.clientLeft + ResizableWindow.MINIMUM_DIMENSIONS + ResizableWindow.RESIZER_THICKNESS}px`);
            divBefore.style.setProperty("width", `${divBefore.clientWidth - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS}px`);
            resizer.classList.add("verticalResizer");
            resizer.style.setProperty("left", `${divBefore.clientLeft + ResizableWindow.MINIMUM_DIMENSIONS}px`);
            resizer.style.setProperty("height", `${this.height}px`);
            resizer.style.setProperty("width", `${ResizableWindow.RESIZER_THICKNESS}px`);
        }
        else {
            child.div.style.setProperty("height", `${child.height}px`);
            child.div.style.setProperty("width", `${this.width}px`);
            child.div.style.setProperty("left", `${divBefore.clientLeft}px`);
            child.div.style.setProperty("top", `${this.div.clientTop}px`);
            divBefore.style.setProperty("top", `${divBefore.clientTop + ResizableWindow.MINIMUM_DIMENSIONS + ResizableWindow.RESIZER_THICKNESS}px`);
            divBefore.style.setProperty("height", `${divBefore.clientHeight - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS}px`);
            resizer.classList.add("horizontalResizer");
            resizer.style.setProperty("top", `${divBefore.clientTop + ResizableWindow.MINIMUM_DIMENSIONS}px`);
            resizer.style.setProperty("height", `${ResizableWindow.RESIZER_THICKNESS}px`);
            resizer.style.setProperty("width", `${this.width}`);
        }
        resizer.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.activeResizer = resizer;
            const startPos = { x: event.clientX, y: event.clientY };
            console.log(this);
            console.log(startPos);
            const dragStart = (event) => {
                console.log("ee");
            };
            const dragFinish = (event) => {
                console.log("finish");
                this.activeResizer = null;
                window.removeEventListener("mousemove", dragStart);
                window.removeEventListener("mouseup", dragFinish);
            };
            const dragCancel = (event) => {
                if (event.key === "Escape") {
                    console.log("cancel");
                    this.activeResizer = null;
                    window.removeEventListener("mousemove", dragStart);
                    window.removeEventListener("mouseup", dragFinish);
                    window.removeEventListener("keydown", dragCancel);
                }
            };
            window.addEventListener("mousemove", dragStart);
            window.addEventListener("keydown", dragCancel);
            window.addEventListener("mouseup", dragFinish);
        });
        this.div.insertBefore(resizer, divBefore);
    }
    moveResizer(x, y) {
        if (!this.activeResizer) {
            throw new Error("There is no resizer to move");
        }
        Array.from(this.div.childNodes).filter((element) => {
            return element instanceof HTMLElement && (element.classList.contains("verticalResizer") || element.classList.contains("horizontalResizer"));
        });
    }
    /** Resizes the Window. Should only be called
     *
     * @param newWidth
     * @param newHeight
     */
    resize(newWidth, newHeight) {
        this.div.style.setProperty("width", `${newWidth}px`);
        this.div.style.setProperty("height", `${newHeight}`);
        this.width = newWidth;
        this.height = newHeight;
    }
    setInitialChild(child) {
        this.children = [child];
        child.div.style.setProperty("width", `${this.width}px`);
        child.div.style.setProperty("height", `${this.height}px`);
        child.div.style.setProperty("left", `${this.div.clientLeft}px`);
        child.div.style.setProperty("top", `${this.div.clientTop}px`);
        child.width = this.width;
        child.height = this.height;
        this.div.append(child.div);
    }
}
