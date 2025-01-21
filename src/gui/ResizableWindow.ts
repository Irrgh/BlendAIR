import { ContentWindow } from './ContentWindow';
/**
 * Represent a hierarchial resizeable Container for a actual {@link ContentWindow}s to be displayed in.
 */
export class ResizableWindow {

    //** In pixel */
    public static MINIMUM_DIMENSIONS: number = 25;
    public static RESIZER_THICKNESS: number = 3;
    private activeResizerIndex?: number;


    constructor(width: number, height: number, parent?: ResizableWindow, layout?: ChildLayout) {
        this.width = width;
        this.height = height;
        this.parent = parent;
        this.layout = layout ? (layout) : "horizontal";  // if layout is defined else default to "horizontal"
        this.div = document.createElement("div");
        this.div.style.setProperty("width", `${this.width}px`);
        this.div.style.setProperty("height", `${this.height}px`);
        this.div.classList.add("app-window");
        this.children = [];
        this.resizers = [];
    }

    private parent?: ResizableWindow;

    /**
     * Either Content or two or more ResizeableWindows?
     */
    private children: ResizableWindow[] | ContentWindow;
    private resizers: HTMLDivElement[];
    private div: HTMLDivElement;
    private layout: ChildLayout;

    public width: number;
    public height: number;





    /**
     * Creates a Root window for the app.
     * Should only be called once per tab.
     * @returns the root window of the app.
     */
    public static initializeRootWindow(childLayout: ChildLayout): ResizableWindow {
        const root = new ResizableWindow(window.innerWidth, window.innerHeight);
        document.body.appendChild(root.div);
        root.div.classList.remove("app-window");
        root.div.classList.add("app-window-root");
        window.addEventListener("resize", (event) => {
            root.setBottomTo(window.innerHeight);
            root.setRightTo(window.innerWidth);
        });
        return root;
    }


    /**
     * Sets the bounds of {@link ResizableWindow}.
     * @param width in px
     * @param height in px
     * @param left in px
     * @param top in px
     */
    private setBounds(width: number, height: number, left: number, top: number) {
        this.setWidth(width);
        this.setHeight(height);
        this.setLeft(left);
        this.setTop(top);
    }

    private setWidth(width: number) {
        this.width = width;
        this.div.style.width = `${width}px`;
    }

    private setHeight(height: number) {
        this.height = height;
        this.div.style.height = `${height}px`;
    }

    private setLeft(left: number) {
        this.div.style.left = `${left}px`;
    }

    private setTop(top: number) {
        this.div.style.top = `${top}px`;
    }




    public getBounds(): DOMRect {
        return this.div.getBoundingClientRect();
    }



    public setContent(content: ContentWindow) {

        if (this.children instanceof ContentWindow || this.children.length <= 1) {
            this.children = content;
            content.setParent(this);
        } else {
            throw new Error("Cant set content since there are more than 1 children");
        }
    }

    public getDiv() {
        return this.div;
    }

    public addChild(index: number, layout:ChildLayout, size?: number):ResizableWindow {


        if (this.children instanceof ContentWindow) {
            throw new Error("Child is already content");
        }

        index = Math.max(0, index);
        size = size ? size : ResizableWindow.MINIMUM_DIMENSIONS;

        let child: ResizableWindow;

        if (this.children.length === 0) {
            child = new ResizableWindow(this.width, this.height, this, layout);
            this.div.append(child.div);
            this.children.push(child);
        } else {

            const childrenBefore = this.children.slice(0, index);
            const childrenAfter = this.children.slice(index);
            const childBefore = this.children[index];

            child = new ResizableWindow(0, 0, this, layout);

            this.children = childrenBefore.concat([child],childrenAfter);

            console.log(childBefore.div);


            if (childBefore.div) {
                this.div.insertBefore(child.div, childBefore.div);        // probably not needed
            } else {
                this.div.appendChild(child.div);
            }

            const resizer = document.createElement("div");


            switch (this.layout) {



                case "horizontal":

                    child.setWidth(size);
                    child.setHeight(this.height);
                    child.setLeft(childBefore.getBounds().left);
                    child.setTop(this.getBounds().top);


                    childBefore.setLeft(childBefore.getBounds().left + child.width + ResizableWindow.RESIZER_THICKNESS);
                    childBefore.setWidth(childBefore.getBounds().width - child.width - ResizableWindow.RESIZER_THICKNESS);

                    resizer.classList.add("verticalResizer");
                    resizer.style.setProperty("left", `${childBefore.div.getBoundingClientRect().left - ResizableWindow.RESIZER_THICKNESS}px`);
                    resizer.style.setProperty("width", `${ResizableWindow.RESIZER_THICKNESS}px`);

                    break;
                case 'vertical':


                    child.setWidth(this.width);
                    child.setHeight(size);
                    child.setLeft(this.getBounds().left);
                    child.setTop(childBefore.getBounds().top);

                    childBefore.setTop(childBefore.div.getBoundingClientRect().top + child.height + ResizableWindow.RESIZER_THICKNESS);
                    childBefore.setHeight(childBefore.div.getBoundingClientRect().height - child.height - ResizableWindow.RESIZER_THICKNESS);

                    resizer.classList.add("horizontalResizer");
                    resizer.style.setProperty("top", `${childBefore.div.getBoundingClientRect().top - ResizableWindow.RESIZER_THICKNESS}px`);
                    resizer.style.setProperty("height", `${ResizableWindow.RESIZER_THICKNESS}px`);
                    //resizer.style.setProperty("width", `${this.width}`);



                    break;
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
                    this.activeResizerIndex = undefined;
                    window.removeEventListener("mousemove", dragStart);
                    window.removeEventListener("mouseup", dragFinish);
                    window.removeEventListener("keydown", dragCancel);
                }

                // called when movement is canceled
                const dragCancel = (event: KeyboardEvent) => {

                    if (event.key === "Escape") {
                        this.moveResizer(startPos.x,startPos.y);
                        this.activeResizerIndex = undefined;
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


        return child;
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


        if (this.children instanceof ContentWindow || this.children.length == 0) {
            return this.getBounds().left + ResizableWindow.MINIMUM_DIMENSIONS;
        } else {

            if (this.layout === "horizontal") {

                return this.children[this.children.length - 1].calculateLeftClearance();
            } else {

                return Math.max(...this.children.map((el) => {
                    return el.calculateLeftClearance();
                }));                

            }
        }

    }

    /** Calculates the rightmost position of resizer left attribute
     * 
     * @returns 
     */
    private calculateRightClearance(): number {

        if (this.children instanceof ContentWindow || this.children.length == 0) {
            console.log(this.getBounds().left, this.width, ResizableWindow.MINIMUM_DIMENSIONS, ResizableWindow.RESIZER_THICKNESS);
            return this.getBounds().left + this.width - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS;
        } else {

            if (this.layout === "horizontal") {

                return this.children[0].calculateRightClearance();
            } else {

                return Math.min(...this.children.map((el) => {
                    return el.calculateRightClearance();
                }))

            }
        }

    }


    private calculateTopClearance(): number {

        if (this.children instanceof ContentWindow || this.children.length == 0) {
            return this.div.getBoundingClientRect().top + ResizableWindow.MINIMUM_DIMENSIONS;
        } else {

            if (this.layout === "vertical") {

                return this.children[this.children.length - 1].calculateTopClearance();
            } else {

                return Math.max(...this.children.map((el) => {
                    return el.calculateTopClearance();
                }))

            }
        }

    }

    private calculateBottomClearance(): number {

        if (this.children instanceof ContentWindow || this.children.length == 0) {
            console.log("Window: ", this);
            console.log("Parameters: ", this.div.getBoundingClientRect().top, this.height, ResizableWindow.MINIMUM_DIMENSIONS, ResizableWindow.RESIZER_THICKNESS);
            return this.div.getBoundingClientRect().top + this.height - ResizableWindow.MINIMUM_DIMENSIONS - ResizableWindow.RESIZER_THICKNESS;
        } else {

            if (this.layout === "vertical") {

                return this.children[0].calculateBottomClearance();
            } else {

                return Math.min(...this.children.map((el) => {
                    return el.calculateBottomClearance();
                }))

            }
        }

    }


    private moveResizer(x: number, y: number) {

        if (this.children instanceof ContentWindow) {
            throw new Error("There should be no resizer in content");
        }

        if (this.activeResizerIndex == undefined) { throw new Error("There is no resizer to move") }

        console.log(x, y);

        const child1 = this.children[this.activeResizerIndex];
        const child2 = this.children[this.activeResizerIndex + 1];


        switch (this.layout) {
            case "horizontal":

                const leftmost = child1.calculateLeftClearance();
                const rightmost = child2.calculateRightClearance();

                const totalChildWidth = child1.width + child2.width;

                const resizerLeft = Math.max(Math.min(x, rightmost), leftmost);

                this.resizers[this.activeResizerIndex].style.setProperty("left", `${resizerLeft}px`);


                child1.setRightTo(resizerLeft);
                child2.setLeftTo(resizerLeft + ResizableWindow.RESIZER_THICKNESS);



                console.log("Horizontal: ", leftmost, rightmost, resizerLeft);

                break;
            case "vertical":

                const topmost = child1.calculateTopClearance();
                const bottommost = child2.calculateBottomClearance();

                const totalChildHeight = child1.height + child2.height;

                const resizerTop = Math.max(Math.min(y, bottommost), topmost);

                this.resizers[this.activeResizerIndex].style.setProperty("top", `${resizerTop}px`);


                child1.setBottomTo(resizerTop);
                child2.setTopTo(resizerTop + ResizableWindow.RESIZER_THICKNESS);


                console.log("Vertical: ", topmost, bottommost, resizerTop);

                break;
        }











    }


    private setTopTo(top: number): void {
        if (top < 0) { throw new Error(`top is smaller than 0: ${top}`) }
        const originalLayout = this.getBounds();
        this.setHeight(this.height - top + originalLayout.top);
        this.setTop(top);


        if (!(this.children instanceof ContentWindow) && this.children.length > 0) {
            switch (this.layout) {
                case "horizontal":
                    this.children.forEach((child) => { child.setTopTo(top); })
                    break;                          // all children get "squished"
                case "vertical":
                    this.children[0].setTopTo(top);
                    break;                          // top child gets "squished"
            }
        }
    }

    private setBottomTo(bottom: number): void {
        if (bottom > window.innerHeight) { throw new Error(`bottom is greater than window.innerHeight: ${bottom}`) }
        const originalLayout = this.getBounds();
        if (bottom <= originalLayout.top) { throw new Error(`no negative height allowed`) }
        
        this.setHeight(bottom - originalLayout.top);

        if (this.children instanceof ContentWindow) {
            this.children.resize(this.width,this.height);
        }


        if (!(this.children instanceof ContentWindow) && this.children.length > 0) {
            switch (this.layout) {
                case "horizontal":
                    this.children.forEach((child) => { child.setBottomTo(bottom); })
                    break;                          // all children get "squished"
                case "vertical":
                    this.children[this.children.length - 1].setBottomTo(bottom);
                    break;                          // bottom child gets "squished"
            }
        }
    }


    private setLeftTo(left: number): void {
        if (left < 0) { throw new Error(`left is smaller than 0: ${left}`) }
        const originalLayout = this.getBounds();
        if (left >= originalLayout.right) { throw new Error(`no negative width allowed`) }
        
        this.setWidth(this.width + originalLayout.left - left);
        this.setLeft(left);

        if (this.children instanceof ContentWindow) {
            this.children.resize(this.width,this.height);
        }





        if (!(this.children instanceof ContentWindow) && this.children.length > 0) {
            switch (this.layout) {
                case "vertical":
                    this.children.forEach((child) => { child.setLeftTo(left); })
                    break;                          // all children get "squished"
                case "horizontal":
                    this.children[0].setLeftTo(left);
                    break;                          // left child gets "squished"
            }
        }

    }

    private setRightTo(right: number): void {
        if (right > window.innerWidth) { throw new Error(`right is greater than window.innerWidth: ${right}`) }
        const originalLayout = this.getBounds();
        if (right <= originalLayout.left) { throw new Error(`no negative width allowed`) }
        this.setWidth(right - originalLayout.left);

        if (this.children instanceof ContentWindow) {
            this.children.resize(this.width,this.height);
        }

        if (!(this.children instanceof ContentWindow) && this.children.length > 0) {
            switch (this.layout) {
                case "vertical":
                    this.children.forEach((child) => { child.setRightTo(right); })
                    break;                          // all children get "squished"
                case "horizontal":
                    this.children[this.children.length - 1].setRightTo(right);
                    break;                          // left child gets "squished"
            }
        }

    }

}




