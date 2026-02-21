import { Viewport } from './Viewport';
export interface Controller {
    readonly type: string;
    manage(viewport : Viewport) : Promise<void>;
    detach(): Promise<void>;
}