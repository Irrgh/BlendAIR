import { Viewport } from './Viewport';
export interface Controller {
    manage(viewport : Viewport) : Promise<void>;
    detach(): Promise<void>;
}