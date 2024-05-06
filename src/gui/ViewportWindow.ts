import { Util } from "../util/Util.js";
import { Viewport } from "../Viewport.js";
import { ResizableLayout, ResizableType, ResizableWindow } from "./ResizableWindow.js";

import shader from "../../assets/shaders/main.wgsl";

export class ViewportWindow extends ResizableWindow {

  constructor() {
    super(null, ResizableLayout.HORIZONTAL, ResizableType.CHILD);
    this.canvas = document.createElement("canvas");
    this.viewport = new Viewport(this.canvas);
    this.div.append(this.canvas);

  }

  public canvas: HTMLCanvasElement;
  public viewport: Viewport;





  public render = async (time: DOMHighResTimeStamp) => {
    //console.log(time);
    //console.log(this);
    //await this.viewport?.clear(Util.randomColor(1));

    const shader = /**wgsl */`struct VertexOut {
      @builtin(position) position: vec4f,
      @location(0) color: vec4f
}
    
@vertex
fn vertex_main(@location(0) position: vec4f, @location(1) color: vec4f) -> VertexOut {
    var output: VertexOut;
    output.position = position;
    output.color = color;
    return output;
}
    
@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
    return fragData.color;
}`






    const vertices = new Float32Array([
      0.0, 0.6, 0, 1, 1, 0, 0, 1,
      -0.5, -0.6, 0, 1, 0, 1, 0, 1,
      0.5, -0.6, 0, 1, 0, 0, 1, 1,
      1, 0.5, 1, 1, 1, 1, 0, 1
    ]);


    await this.viewport.render(vertices, shader);


    requestAnimationFrame(this.render);
  }




}