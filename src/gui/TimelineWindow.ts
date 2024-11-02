import { App } from '../app';
import { Timeline } from '../engine/Timeline';
import { ContentWindow } from './ContentWindow';
export class TimelineWindow extends ContentWindow {
    
    private current : HTMLSpanElement;
    private range : HTMLInputElement;



    constructor () {

        const div = document.createElement("div");
        super(div)
        
        const timeline = App.getScene().timeline;

        this.current = document.createElement("span");
        this.current.innerText = `${timeline.getCurrent()}`;
        this.current.classList.add("window-header-element");

        this.range = document.createElement("input");
        this.range.type = "range";
        this.range.min = `${timeline.getFirst()}`;
        this.range.max = `${timeline.getLast()}`;
        this.range.value = `${timeline.getCurrent()}`;
        this.range.step = "1";
        this.range.classList.add("timeline");
        this.range.addEventListener("input", (event) => {

            timeline.setCurrent(parseInt(this.range.value));
            this.current.innerText = this.range.value;
            requestAnimationFrame(() => {App.getScene().viewports.forEach(viewport => {viewport.render()})});
        });

        div.append(this.range);
        this.headerElement.append(this.current);


    }
    
    
    resize(width: number, height: number): void {
    }

    






}