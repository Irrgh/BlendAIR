

export enum ResizableLayout {
    VERTICAL,
    HORIZONTAL
}

export enum ResizableType {
    ROOT,
    BRANCH,
    CHILD
}


export class ResizableWindow {

    //public static rootDiv: HTMLDivElement;

    //** In pixel */
    public static MINIMUM_DIMENSIONS: number = 50;
    public static RESIZER_THICKNESS: number = 3;
    public activeResizerIndex: number | null = null;


    constructor(parentWindow: ResizableWindow | null, childLayout: ResizableLayout, type: ResizableType = ResizableType.CHILD) {
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


        } else {
            this.div.classList.add("app-window");

            this.width = ResizableWindow.MINIMUM_DIMENSIONS;
            this.height = ResizableWindow.MINIMUM_DIMENSIONS;
        }

        this.children = [];
        this.resizers = [];
    }

    public parent: ResizableWindow | null;
    public children: ResizableWindow[];
    public resizers: HTMLDivElement[];
    public div: HTMLDivElement;
    public childLayout: ResizableLayout;
    public type: ResizableType;

    public width: number;
    public height: number;







    /**
     * Creates a Root window for the app.
     * Should only be called once per tab.
     * @returns the root window of the app.
     */
    public static initializeRootWindow(childLayout: ResizableLayout): ResizableWindow {
        const root = new ResizableWindow(null, childLayout, ResizableType.ROOT);
        document.body.appendChild(root.div);
        window.addEventListener("resize",(event) => {
            root.setBottomTo(window.innerHeight);
            root.setRightTo(window.innerWidth);
        });
        return root;
    }

    private setInitialChild(child: ResizableWindow) {
        this.children = [child];
        this.div.append(child.div);
        console.log("i went here");
        child.div.style.setProperty("width", `${this.width}px`);
        child.div.style.setProperty("height", `${this.height}px`);
        child.div.style.setProperty("left", `${this.div.getBoundingClientRect().left}px`);
        child.div.style.setProperty("top", `${this.div.getBoundingClientRect().top}px`);
        child.width = this.width;
        child.height = this.height;
    }



    /**
     * Inserts a child at the specified position.
     * Blender equivalent is drag right !
     * @param child child to be inserted.
     * @param index of the element to be prepended.
     */
    public insertChildBefore(child: ResizableWindow, index: number) {

        this.type = ResizableType.BRANCH;


        if (this.children.length == 0) {                            // setup of first child;
            return this.setInitialChild(child);
        }

        const childBefore = this.children[index];

        const childrenBefore = this.children.slice(0, index)        // insert child into list of children
        const childrenAfter = this.children.slice(index);
        this.children = childrenBefore.concat([child], childrenAfter);




        console.log(childBefore.div);


        if (childBefore.div) {
            this.div.insertBefore(child.div, childBefore.div);        // probably not needed
        } else {
            this.div.appendChild(child.div);
        }

        const resizer = document.createElement("div");

        if (this.childLayout === ResizableLayout.HORIZONTAL) {

            child.height = this.height;
            child.div.style.setProperty("width", `${child.width}px`);
            child.div.style.setProperty("height", `${child.height}px`);
            child.div.style.setProperty("left", `${childBefore.div.getBoundingClientRect().left}px`);
            child.div.style.setProperty("top", `${this.div.getBoundingClientRect().top}px`);

            childBefore.div.style.setProperty("left", `${childBefore.div.getBoundingClientRect().left + child.width + ResizableWindow.RESIZER_THICKNESS}px`);
            childBefore.div.style.setProperty("width", `${childBefore.div.getBoundingClientRect().width - child.width - ResizableWindow.RESIZER_THICKNESS}px`);
            childBefore.width -= (child.width + ResizableWindow.RESIZER_THICKNESS);

            resizer.classList.add("verticalResizer");
            resizer.style.setProperty("left", `${childBefore.div.getBoundingClientRect().left - ResizableWindow.RESIZER_THICKNESS}px`);
            //resizer.style.setProperty("height", `${this.height}px`);
            resizer.style.setProperty("width", `${ResizableWindow.RESIZER_THICKNESS}px`);

        } else {
            child.width = this.width;
            child.div.style.setProperty("height", `${child.height}px`);
            child.div.style.setProperty("width", `${child.width}px`);
            child.div.style.setProperty("left", `${this.div.getBoundingClientRect().left}px`);
            child.div.style.setProperty("top", `${childBefore.div.getBoundingClientRect().top}px`);

            childBefore.div.style.setProperty("top", `${childBefore.div.getBoundingClientRect().top + child.height + ResizableWindow.RESIZER_THICKNESS}px`);
            childBefore.div.style.setProperty("height", `${childBefore.div.getBoundingClientRect().height - child.height - ResizableWindow.RESIZER_THICKNESS}px`);
            childBefore.height -= (child.height + ResizableWindow.RESIZER_THICKNESS);

            resizer.classList.add("horizontalResizer");
            resizer.style.setProperty("top", `${childBefore.div.getBoundingClientRect().top - ResizableWindow.RESIZER_THICKNESS}px`);
            resizer.style.setProperty("height", `${ResizableWindow.RESIZER_THICKNESS}px`);
            //resizer.style.setProperty("width", `${this.width}`);

        }

        resizer.addEventListener("mousedown", (event) => {

            event.preventDefault();
            event.stopPropagation();

            this.activeResizerIndex = this.getResizerIndex(resizer);
            const startPos = { x: event.clientX, y: event.clientY }
            console.log(this);
            console.log(startPos);

            // called continuously while mouse is moving
            const dragStart = (event: MouseEvent) => {
                this.moveResizer(event.clientX, event.clientY);
            }

            // called when movement is properly ended
            const dragFinish = (event: MouseEvent) => {
                console.log("finish");
                this.activeResizerIndex = null;
                window.removeEventListener("mousemove", dragStart);
                window.removeEventListener("mouseup", dragFinish);
            }

            // called when movement is canceled
            const dragCancel = (event: KeyboardEvent) => {

                if (event.key === "Escape") {
                    console.log("cancel");
                    this.activeResizerIndex = null;
                    window.removeEventListener("mousemove", dragStart);
                    window.removeEventListener("mouseup", dragFinish);
                    window.removeEventListener("keydown", dragCancel);
                }


            }

            window.addEventListener("mousemove", dragStart);
            window.addEventListener("keydown", dragCancel);
            window.addEventListener("mouseup", dragFinish);


        });


        this.div.insertBefore(resizer, childBefore.div);
        this.resizers.push(resizer);


    }

    private getResizerIndex(resizer: HTMLDivElement): number {
        for (let i = 0; i < this.resizers.length; i++) {
            if (this.resizers[i] === resizer) {
                return i;
            }
        }
        console.log(this.resizers);
        throw new Error(`Resizer does not exist in list 🤔`);
    }

    /** Calculates the leftmost position of resizer left attribute
     * 
     * @returns 
     */
    private calculateLeftClearance(): number {

        if (this.children.length == 0) {
            return this.div.getBoundingClientRect().left + ResizableWindow.MINIMUM_DIMENSIONS;
        } else {

            if (this.childLayout == ResizableLayout.HORIZONTAL) {

                return this.children[this.children.length - 1].calculateLeftClearance();
            } else {

                return this.children.map((el) => {
                    return el.calculateLeftClearance();
                }).reduce((acc, curr) => {

                    return Math.max(acc, curr!);         // stfu typescript why would curr be :void

                }, Number.MIN_VALUE);                    // should return the max of this

            }
        }

    }

    /** Calculates the rightmost position of resizer left attribute
     * 
     * @returns 
     */
    private calculateRightClearance(): number {

        if (this.children.length == 0) {
            console.log("Window: ", this);
            console.log("Parameters: ", this.div.getBoundingClientRect().left, this.width, ResizableWindow.MINIMUM_DIMENSIONS, ResizableWindow.RESIZER_THICKNESS);
            return this.div.getBoundingClientRect().left + this.width - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS;
        } else {

            if (this.childLayout == ResizableLayout.HORIZONTAL) {

                return this.children[0].calculateRightClearance();
            } else {

                return this.children.map((el) => {
                    return el.calculateRightClearance();
                }).reduce((acc, curr) => {

                    return Math.min(acc, curr!);         // stfu typescript why would curr be :void

                }, Number.MAX_VALUE);                    // should return the min of this

            }
        }

    }


    private calculateTopClearance(): number {

        if (this.children.length == 0) {
            return this.div.getBoundingClientRect().top + ResizableWindow.MINIMUM_DIMENSIONS;
        } else {

            if (this.childLayout == ResizableLayout.VERTICAL) {

                return this.children[this.children.length - 1].calculateTopClearance();
            } else {

                return this.children.map((el) => {
                    return el.calculateTopClearance();
                }).reduce((acc, curr) => {

                    return Math.min(acc, curr!);         // stfu typescript why would curr be :void

                }, Number.MAX_VALUE);                    // should return the max of this

            }
        }

    }

    private calculateBottomClearance(): number {

        if (this.children.length == 0) {
            console.log("Window: ", this);
            console.log("Parameters: ", this.div.getBoundingClientRect().top, this.height, ResizableWindow.MINIMUM_DIMENSIONS, ResizableWindow.RESIZER_THICKNESS);
            return this.div.getBoundingClientRect().top + this.height - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS;
        } else {

            if (this.childLayout == ResizableLayout.VERTICAL) {

                return this.children[0].calculateBottomClearance();
            } else {

                return this.children.map((el) => {
                    return el.calculateBottomClearance();
                }).reduce((acc, curr) => {
                    return Math.max(acc, curr!);         // stfu typescript why would curr be :void

                }, Number.MIN_VALUE);                    // should return the min of this

            }
        }

    }


    private moveResizer(x: number, y: number) {

        if (this.activeResizerIndex == undefined) { throw new Error("There is no resizer to move") }

        console.log(x, y);

        const child1 = this.children[this.activeResizerIndex];
        const child2 = this.children[this.activeResizerIndex + 1];


        switch (this.childLayout) {
            case ResizableLayout.HORIZONTAL:



                const leftmost = child1.calculateLeftClearance();
                const rightmost = child2.calculateRightClearance();

                const totalChildWidth = child1.width + child2.width;

                const resizerLeft = Math.max(Math.min(x, rightmost), leftmost);

                this.resizers[this.activeResizerIndex].style.setProperty("left", `${resizerLeft}px`);

                //child1.width = resizerLeft - child1.div.getBoundingClientRect().left;
                //child2.width = totalChildWidth - child1.width;  // probably no resizerThickness needed
                //child1.div.style.setProperty("width", `${child1.width}px`);
                //child2.div.style.setProperty("left", `${resizerLeft + ResizableWindow.RESIZER_THICKNESS}px`);
                //child2.div.style.setProperty("width", `${child2.width}px`);

                child1.setRightTo(resizerLeft);
                child2.setLeftTo(resizerLeft+ResizableWindow.RESIZER_THICKNESS);



                console.log("Horizontal: ", leftmost, rightmost, resizerLeft);

                break;
            case ResizableLayout.VERTICAL:

                const topmost = child1.calculateTopClearance();
                const bottommost = child2.calculateBottomClearance();

                const totalChildHeight = child1.height + child2.height;

                const resizerTop = Math.max(Math.min(y, bottommost), topmost);

                this.resizers[this.activeResizerIndex].style.setProperty("top", `${resizerTop}px`);

                //child1.height = resizerTop - child1.div.getBoundingClientRect().top;
                //child2.height = totalChildHeight - child1.height;
                //child1.div.style.setProperty("height", `${resizerTop}px`);
                //child2.div.style.setProperty("top", `${resizerTop + ResizableWindow.RESIZER_THICKNESS}px`);
                //child2.div.style.setProperty("height", `${child2.height}px`);

                child1.setBottomTo(resizerTop);
                child2.setTopTo(resizerTop+ResizableWindow.RESIZER_THICKNESS);


                console.log("Vertical: ", topmost, bottommost, resizerTop);

                break;
        }











    }


    private setTopTo(top: number): void {
        if (top < 0) { throw new Error(`top is smaller than 0: ${top}`) }
        const originalLayout = this.div.getBoundingClientRect();
        const heightDifference = top - originalLayout.top;
        this.height -= heightDifference;
        this.div.style.top = `${top}px`;
        this.div.style.height = `${this.height}px`;

        if (this.children.length > 0) {
            switch (this.childLayout) {
                case ResizableLayout.HORIZONTAL:
                    this.children.forEach((child) => {child.setTopTo(top);})
                    break;                          // all children get "squished"
                case ResizableLayout.VERTICAL:
                    this.children[0].setTopTo(top);
                    break;                          // top child gets "squished"
            }
        }
    }

    private setBottomTo(bottom: number): void {
        if (bottom > window.innerHeight) { throw new Error(`bottom is greater than window.innerHeight: ${bottom}`) }
        const originalLayout = this.div.getBoundingClientRect();
        if (bottom <= originalLayout.top) { throw new Error(`no negative height allowed`) }
        this.height = bottom - originalLayout.top;
        this.div.style.height = `${this.height}px`;

        if (this.children.length > 0) {
            switch (this.childLayout) {
                case ResizableLayout.HORIZONTAL:
                    this.children.forEach((child) => {child.setBottomTo(bottom);})
                    break;                          // all children get "squished"
                case ResizableLayout.VERTICAL:
                    this.children[this.children.length-1].setBottomTo(bottom);
                    break;                          // bottom child gets "squished"
            }
        }
    }


    private setLeftTo(left: number): void {
        if (left < 0) { throw new Error(`left is smaller than 0: ${left}`) }
        const originalLayout = this.div.getBoundingClientRect();
        if (left >= originalLayout.right) { throw new Error(`no negative width allowed`) }
        const widthDifference = originalLayout.left - left;
        this.width += widthDifference;
        this.div.style.left = `${left}px`;
        this.div.style.width = `${this.width}px`;

        if (this.children.length > 0) {
            switch (this.childLayout) {
                case ResizableLayout.VERTICAL:
                    this.children.forEach((child) => {child.setLeftTo(left);})
                    break;                          // all children get "squished"
                case ResizableLayout.HORIZONTAL:
                    this.children[0].setLeftTo(left);
                    break;                          // left child gets "squished"
            }
        }

    }

    private setRightTo(right: number): void {
        if (right > window.innerWidth) { throw new Error(`right is greater than window.innerWidth: ${right}`) }
        const originalLayout = this.div.getBoundingClientRect();
        if (right <= originalLayout.left) { throw new Error(`no negative width allowed`) }
        this.width = right - originalLayout.left;
        this.div.style.width = `${this.width}px`;

        if (this.children.length > 0) {
            switch (this.childLayout) {
                case ResizableLayout.VERTICAL:
                    this.children.forEach((child) => {child.setRightTo(right);})
                    break;                          // all children get "squished"
                case ResizableLayout.HORIZONTAL:
                    this.children[this.children.length-1].setRightTo(right);
                    break;                          // left child gets "squished"
            }
        }

    }




    /** Resizes the Window. Should only be called 
     * 
     * @param newWidth 
     * @param newHeight 
     */
    private resize(newWidth: number, newHeight: number): void {
        this.div.style.setProperty("width", `${newWidth}px`);
        this.div.style.setProperty("height", `${newHeight}`);
        this.width = newWidth;
        this.height = newHeight;
    }












}




