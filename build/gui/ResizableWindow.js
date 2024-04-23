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
    activeResizerIndex = null;
    constructor(parentWindow, childLayout, type = ResizableType.CHILD) {
        this.parent = parentWindow;
        this.div = document.createElement("div");
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
        const divBefore = this.children[index].div;
        const childrenBefore = this.children.slice(0, index); // insert child into list of children
        const childrenAfter = this.children.slice(index);
        this.children = childrenBefore.concat([child], childrenAfter);
        console.log(divBefore);
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
            this.activeResizerIndex = this.getResizerIndex(resizer);
            const startPos = { x: event.clientX, y: event.clientY };
            console.log(this);
            console.log(startPos);
            // called continuously while mouse is moving
            const dragStart = (event) => {
                this.moveResizer(event.clientX, event.clientY);
            };
            // called when movement is properly ended
            const dragFinish = (event) => {
                console.log("finish");
                this.activeResizerIndex = null;
                window.removeEventListener("mousemove", dragStart);
                window.removeEventListener("mouseup", dragFinish);
            };
            // called when movement is canceled
            const dragCancel = (event) => {
                if (event.key === "Escape") {
                    console.log("cancel");
                    this.activeResizerIndex = null;
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
        this.resizers.push(resizer);
    }
    getResizerIndex(resizer) {
        for (let i = 0; i < this.resizers.length; i++) {
            if (this.resizers[i] === resizer) {
                return i;
            }
        }
        console.log(this.resizers);
        throw new Error(`Resizer does not exist in list 🤔`);
    }
    /** Caculates the leftmost position of resizer left attribute
     *
     * @returns
     */
    calculateLeftClearance() {
        if (this.children.length == 0) {
            return this.div.clientLeft + ResizableWindow.MINIMUM_DIMENSIONS;
        }
        else {
            if (this.childLayout == ResizableLayout.HORIZONTAL) {
                return this.children[this.children.length - 1].calculateLeftClearance();
            }
            else {
                return this.children.map((el) => {
                    return el.calculateLeftClearance();
                }).reduce((acc, curr) => {
                    return Math.max(acc, curr); // stfu typescript why would curr be :void
                }, Number.MIN_VALUE); // should return the max of this
            }
        }
    }
    /** Caculates the rightmost position of resizer left attribute
     *
     * @returns
     */
    calculateRightClearance() {
        if (this.children.length == 0) {
            return this.div.clientLeft + this.width - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS;
        }
        else {
            if (this.childLayout == ResizableLayout.HORIZONTAL) {
                return this.children[0].calculateRightClearance();
            }
            else {
                return this.children.map((el) => {
                    return el.calculateRightClearance();
                }).reduce((acc, curr) => {
                    return Math.min(acc, curr); // stfu typescript why would curr be :void
                }, Number.MAX_VALUE); // should return the min of this
            }
        }
    }
    calculateTopClearance() {
        if (this.children.length == 0) {
            return this.div.clientTop + ResizableWindow.MINIMUM_DIMENSIONS;
        }
        else {
            if (this.childLayout == ResizableLayout.VERTICAL) {
                return this.children[0].calculateTopClearance();
            }
            else {
                return this.children.map((el) => {
                    return el.calculateTopClearance();
                }).reduce((acc, curr) => {
                    return Math.min(acc, curr); // stfu typescript why would curr be :void
                }, Number.MAX_VALUE); // should return the max of this
            }
        }
    }
    calculateBottomClearance() {
        if (this.children.length == 0) {
            return this.div.clientTop + this.height - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS;
        }
        else {
            if (this.childLayout == ResizableLayout.VERTICAL) {
                return this.children[this.children.length - 1].calculateBottomClearance();
            }
            else {
                return this.children.map((el) => {
                    return el.calculateBottomClearance();
                }).reduce((acc, curr) => {
                    return Math.max(acc, curr); // stfu typescript why would curr be :void
                }, Number.MIN_VALUE); // should return the min of this
            }
        }
    }
    moveResizer(x, y) {
        if (this.activeResizerIndex == undefined) {
            throw new Error("There is no resizer to move");
        }
        console.log(x, y);
        const child1 = this.children[this.activeResizerIndex];
        const child2 = this.children[this.activeResizerIndex + 1];
        switch (this.childLayout) {
            case ResizableLayout.HORIZONTAL:
                const leftmost = child1.calculateLeftClearance();
                const rightmost = child2.calculateRightClearance();
                const resizerLeft = Math.max(Math.min(x, rightmost), leftmost);
                this.resizers[this.activeResizerIndex].style.setProperty("left", `${resizerLeft}px`);
                child1.div.style.setProperty("width", `${resizerLeft}px`);
                child2.div.style.setProperty("left", `${resizerLeft + ResizableWindow.RESIZER_THICKNESS}px`);
                child2.div.style.setProperty("width", `${this.width - resizerLeft - ResizableWindow.RESIZER_THICKNESS}px`);
                child1.width = resizerLeft;
                child2.width = this.width - resizerLeft - ResizableWindow.RESIZER_THICKNESS;
                break;
            case ResizableLayout.VERTICAL:
                const topmost = child1.calculateTopClearance();
                const bottommost = child2.calculateBottomClearance();
                const resizerTop = Math.max(Math.min(y, bottommost), topmost);
                this.resizers[this.activeResizerIndex].style.setProperty("top", `${resizerTop}px`);
                child1.div.style.setProperty("height", `${resizerTop}px`);
                child2.div.style.setProperty("top", `${resizerTop + ResizableWindow.RESIZER_THICKNESS}px`);
                child2.div.style.setProperty("height", `${this.height - resizerTop - ResizableWindow.RESIZER_THICKNESS}px`);
                child1.height = resizerTop;
                child2.height = this.height - resizerTop - ResizableWindow.RESIZER_THICKNESS;
                break;
        }
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
