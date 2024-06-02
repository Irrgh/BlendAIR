import { Viewport } from './Viewport';

/**
 * 
 */
export interface Navigator {

    /**
     * Adds all required {@link EventListener}s to the DOM elements.
     */
    use():void;


    /**
     * Removes all required {@link EventListener}s from the DOM elements.
     */
    stop():void;

}