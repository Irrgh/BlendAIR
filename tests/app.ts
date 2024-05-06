import { ResizableWindow, ResizableLayout, ResizableType } from "../build/gui/ResizableWindow.js";
import { ViewportWindow } from "../build/gui/ViewportWindow.js"



const root = ResizableWindow.initializeRootWindow(ResizableLayout.VERTICAL);

const child = new ResizableWindow(null, ResizableLayout.HORIZONTAL, ResizableType.CHILD);

root.insertChildBefore(new ResizableWindow(null, ResizableLayout.VERTICAL, ResizableType.CHILD), 0);
const viewport = new ViewportWindow();
//requestAnimationFrame(viewport.render);
root.insertChildBefore(viewport, 0);
root.insertChildBefore(child, 1);

child.insertChildBefore(new ResizableWindow(null, ResizableLayout.HORIZONTAL, ResizableType.CHILD), 0);
child.insertChildBefore(new ResizableWindow(null, ResizableLayout.HORIZONTAL, ResizableType.CHILD), 0);
child.insertChildBefore(new ResizableWindow(null, ResizableLayout.HORIZONTAL, ResizableType.CHILD), 1);
child.insertChildBefore(new ResizableWindow(null, ResizableLayout.HORIZONTAL, ResizableType.CHILD), 2);